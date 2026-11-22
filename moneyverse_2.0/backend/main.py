import os
import sys
import csv
import io

# Ensure the backend directory is first in sys.path so Vercel serverless imports resolve accurately
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import init_db, get_db, User, IncomeLog, Expense, Goal, AIConversation
import schemas
import crud
import auth
import ai

# Initialize database tables
init_db()

app = FastAPI(
    title="MONEYVERSE 2.0 API",
    description="Multilingual AI-Powered Personal Finance Management Platform",
    version="2.0.0"
)

# Configurable CORS for single-URL and development environments
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*")
allow_origins = [orig.strip() for orig in CORS_ORIGINS_RAW.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# 1. Health & Ollama Status
# ----------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "MONEYVERSE 2.0",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/ai/status", response_model=schemas.OllamaStatus)
async def get_ollama_status():
    status_info = await ai.check_ollama_status()
    return schemas.OllamaStatus(
        is_connected=status_info["is_connected"],
        model=status_info["model"],
        available_models=status_info["available_models"],
        message=status_info["message"]
    )

# ----------------------------------------------------
# 2. Authentication & User Profile
# ----------------------------------------------------
@app.post("/api/auth/register", response_model=schemas.AuthResponse)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if username or email exists
    if crud.get_user_by_username(db, user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    if crud.get_user_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
    
    hashed_pw = auth.hash_password(user_in.password)
    user = crud.create_user(db, user_in, hashed_pw)
    token = auth.create_user_session(db, user.id)

    # Optional initial income log if provided during sign up
    if user_in.monthly_income and user_in.monthly_income > 0:
        crud.add_user_income(
            db, user.id,
            schemas.IncomeCreate(
                amount=user_in.monthly_income,
                source="Monthly Salary / Primary",
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                notes="Initial monthly income upon sign up"
            )
        )

    return schemas.AuthResponse(
        token=token,
        user=schemas.UserOut.model_validate(user),
        message="Account created successfully"
    )

@app.post("/api/auth/login", response_model=schemas.AuthResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_login_id(db, login_data.login_id)
    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )
    
    token = auth.create_user_session(db, user.id)
    return schemas.AuthResponse(
        token=token,
        user=schemas.UserOut.model_validate(user),
        message="Logged in successfully"
    )

@app.post("/api/auth/logout")
def logout(
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # We revoke all sessions or the specific one; here we clear user's sessions
    db.query(auth.UserSession).filter(auth.UserSession.user_id == user.id).delete()
    db.commit()
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me", response_model=schemas.UserOut)
def get_me(user: User = Depends(auth.get_current_user)):
    return schemas.UserOut.model_validate(user)

@app.put("/api/auth/profile", response_model=schemas.UserOut)
def update_profile(
    profile_data: schemas.UserProfileUpdate,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.full_name is not None:
        user.full_name = profile_data.full_name
    if profile_data.preferred_language is not None:
        user.preferred_language = profile_data.preferred_language
    if profile_data.monthly_income is not None:
        user.monthly_income = profile_data.monthly_income
    
    db.commit()
    db.refresh(user)
    return schemas.UserOut.model_validate(user)

@app.put("/api/auth/change-password")
def change_password(
    data: schemas.PasswordChange,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not auth.verify_password(data.old_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    user.hashed_password = auth.hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

# ----------------------------------------------------
# 3. Financial Summary & Calculations
# ----------------------------------------------------
@app.get("/api/financial/summary", response_model=schemas.FinancialSummary)
def get_financial_summary(
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.calculate_financial_summary(db, user)

# ----------------------------------------------------
# 4. Income Endpoints
# ----------------------------------------------------
@app.get("/api/incomes", response_model=List[schemas.IncomeOut])
def list_incomes(
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_user_incomes(db, user.id)

@app.post("/api/incomes", response_model=schemas.IncomeOut)
def create_income(
    income_in: schemas.IncomeCreate,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.add_user_income(db, user.id, income_in)

@app.delete("/api/incomes/{income_id}")
def delete_income(
    income_id: int,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    success = crud.delete_user_income(db, user.id, income_id)
    if not success:
        raise HTTPException(status_code=404, detail="Income record not found")
    return {"message": "Income deleted"}

# ----------------------------------------------------
# 5. Expenses Endpoints
# ----------------------------------------------------
@app.get("/api/expenses", response_model=List[schemas.ExpenseOut])
def list_expenses(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_user_expenses(db, user.id, category=category, search=search)

@app.post("/api/expenses", response_model=schemas.ExpenseOut)
def create_expense(
    expense_in: schemas.ExpenseCreate,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.add_user_expense(db, user.id, expense_in)

@app.put("/api/expenses/{expense_id}", response_model=schemas.ExpenseOut)
def update_expense(
    expense_id: int,
    update_data: schemas.ExpenseUpdate,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    exp = crud.update_user_expense(db, user.id, expense_id, update_data)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    return exp

@app.delete("/api/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    success = crud.delete_user_expense(db, user.id, expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ----------------------------------------------------
# 6. Goals Endpoints (Goal Bridge)
# ----------------------------------------------------
@app.get("/api/goals", response_model=List[schemas.GoalOut])
def list_goals(
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_user_goals(db, user.id)

@app.post("/api/goals", response_model=schemas.GoalOut)
def create_goal(
    goal_in: schemas.GoalCreate,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.add_user_goal(db, user.id, goal_in)

@app.put("/api/goals/{goal_id}", response_model=schemas.GoalOut)
def update_goal(
    goal_id: int,
    goal_update: schemas.GoalUpdate,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    updated = crud.update_user_goal(db, user.id, goal_id, goal_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found")
    return updated

@app.delete("/api/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    success = crud.delete_user_goal(db, user.id, goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}

# ----------------------------------------------------
# 7. AI Advisor & Insights (Real Ollama Integration)
# ----------------------------------------------------
@app.post("/api/ai/insights")
async def get_ai_insights(
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    summary = crud.calculate_financial_summary(db, user)
    summary_dict = summary.model_dump()
    
    result = await ai.generate_financial_insights(
        summary_dict,
        language=user.preferred_language or "en"
    )
    
    if not result["success"]:
        return {
            "success": False,
            "insights": "",
            "error": result["error"],
            "model": ai.DEFAULT_MODEL
        }
    
    # Save conversation log
    conv = AIConversation(
        user_id=user.id,
        role="assistant",
        message=result["response"],
        language=user.preferred_language or "en",
        mode="advisor"
    )
    db.add(conv)
    db.commit()

    return {
        "success": True,
        "insights": result["response"],
        "error": None,
        "model": ai.DEFAULT_MODEL
    }

# ----------------------------------------------------
# 8. Money Mirror (Purchase Simulation Engine + AI)
# ----------------------------------------------------
@app.post("/api/ai/simulate-purchase", response_model=schemas.MirrorSimulationResponse)
async def simulate_purchase(
    request: schemas.MirrorSimulationRequest,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    summary = crud.calculate_financial_summary(db, user)
    sim_stats = crud.simulate_purchase(summary, request.item_name, request.purchase_amount)
    
    lang = user.preferred_language or "en"
    ai_res = await ai.generate_mirror_verdict(
        summary.model_dump(),
        request.item_name,
        request.purchase_amount,
        language=lang
    )

    verdict_text = "Analysis Ready"
    explanation_text = ""
    
    if ai_res["success"]:
        resp_lines = ai_res["response"].split("\n")
        explanation_text = ai_res["response"]
        for line in resp_lines:
            if "SAFE TO BUY" in line:
                verdict_text = "SAFE TO BUY"
                break
            elif "WAIT & SAVE" in line:
                verdict_text = "WAIT & SAVE"
                break
            elif "AVOID FOR NOW" in line:
                verdict_text = "AVOID FOR NOW"
                break
        if verdict_text == "Analysis Ready":
            verdict_text = "SAFE TO BUY" if sim_stats["can_afford"] and sim_stats["risk_level"] in ["Low", "Moderate"] else "WAIT & SAVE"
    else:
        # Graceful notice if Ollama is not currently active
        explanation_text = f"Ollama Notice: {ai_res['error']}\n\nMathematical Projection: Remaining balance will be ₹{sim_stats['projected_balance']:,.2f} with risk level: {sim_stats['risk_level']}."
        verdict_text = "SAFE TO BUY" if sim_stats["can_afford"] and sim_stats["risk_level"] in ["Low", "Moderate"] else "AVOID FOR NOW"

    return schemas.MirrorSimulationResponse(
        item_name=request.item_name,
        purchase_amount=request.purchase_amount,
        current_balance=sim_stats["current_balance"],
        projected_balance=sim_stats["projected_balance"],
        current_spent_percentage=sim_stats["current_spent_percentage"],
        projected_spent_percentage=sim_stats["projected_spent_percentage"],
        can_afford=sim_stats["can_afford"],
        risk_level=sim_stats["risk_level"],
        impact_on_goals=sim_stats["impact_on_goals"],
        ai_verdict=verdict_text,
        ai_explanation=explanation_text,
        language=lang
    )

# ----------------------------------------------------
# 9. Money Voice (Voice & Typed Q&A + TTS)
# ----------------------------------------------------
@app.post("/api/ai/voice-chat", response_model=schemas.VoiceChatResponse)
async def voice_chat(
    query: schemas.VoiceChatRequest,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    summary = crud.calculate_financial_summary(db, user)
    lang = query.language or user.preferred_language or "en"

    # Get recent conversation history
    past_conversations = db.query(AIConversation).filter(
        AIConversation.user_id == user.id
    ).order_by(AIConversation.id.desc()).limit(6).all()
    history = [
        {"role": c.role, "message": c.message} for c in reversed(past_conversations)
    ]

    # Save user message
    db.add(AIConversation(
        user_id=user.id,
        role="user",
        message=query.message,
        language=lang,
        mode="voice"
    ))
    db.commit()

    ai_res = await ai.chat_with_advisor(
        summary.model_dump(),
        query.message,
        history,
        language=lang
    )

    if not ai_res["success"]:
        return schemas.VoiceChatResponse(
            response_text=f"AI Service Notice: {ai_res['error']}",
            language=lang,
            audio_base64=None,
            ollama_model=ai.DEFAULT_MODEL,
            success=False,
            error=ai_res["error"]
        )

    response_text = ai_res["response"]
    
    # Save assistant message
    db.add(AIConversation(
        user_id=user.id,
        role="assistant",
        message=response_text,
        language=lang,
        mode="voice"
    ))
    db.commit()

    # Optional gTTS audio fallback
    audio_b64 = None
    if query.include_audio:
        audio_b64 = ai.text_to_speech_base64(response_text, language=lang)

    return schemas.VoiceChatResponse(
        response_text=response_text,
        language=lang,
        audio_base64=audio_b64,
        ollama_model=ai.DEFAULT_MODEL,
        success=True,
        error=None
    )

@app.post("/api/ai/transcribe-audio")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = "en",
    user: User = Depends(auth.get_current_user)
):
    audio_bytes = await file.read()
    result = ai.transcribe_audio_bytes(audio_bytes, language=language)
    return result


# ----------------------------------------------------
# 10. Reports & CSV Export
# ----------------------------------------------------
@app.get("/api/reports/export-csv")
def export_csv(
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    expenses = crud.get_user_expenses(db, user.id)
    incomes = crud.get_user_incomes(db, user.id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Incomes section
    writer.writerow(["MONEYVERSE 2.0 - FINANCIAL REPORT"])
    writer.writerow(["User", user.username, "Email", user.email])
    writer.writerow(["Generated At", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")])
    writer.writerow([])
    
    writer.writerow(["--- INCOMES ---"])
    writer.writerow(["ID", "Date", "Source", "Amount (INR)", "Notes"])
    for inc in incomes:
        writer.writerow([inc.id, inc.date, inc.source, f"{inc.amount:.2f}", inc.notes])
    writer.writerow([])

    # Expenses section
    writer.writerow(["--- EXPENSES ---"])
    writer.writerow(["ID", "Date", "Category", "Payment Method", "Amount (INR)", "Notes"])
    for exp in expenses:
        writer.writerow([exp.id, exp.date, exp.category, exp.payment_method, f"{exp.amount:.2f}", exp.notes])
    writer.writerow([])

    # Summary
    summary = crud.calculate_financial_summary(db, user)
    writer.writerow(["--- SUMMARY ---"])
    writer.writerow(["Monthly Income", f"{summary.monthly_income:.2f}"])
    writer.writerow(["Total Expenses", f"{summary.total_expenses:.2f}"])
    writer.writerow(["Available Balance", f"{summary.available_balance:.2f}"])
    writer.writerow(["Income Spent (%)", f"{summary.income_spent_percentage:.2f}%"])
    writer.writerow(["Highest Category", summary.highest_expense_category or "None"])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=moneyverse_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        }
    )

# ----------------------------------------------------
# 11. Static Frontend & SPA Fallback for Single-URL Deployment
# ----------------------------------------------------
FRONTEND_DIST = os.getenv(
    "FRONTEND_DIST",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
)

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/favicon.svg")
    async def get_favicon():
        fav_path = os.path.join(FRONTEND_DIST, "favicon.svg")
        if os.path.exists(fav_path):
            return FileResponse(fav_path)
        return Response(status_code=404)

    @app.get("/icons.svg")
    async def get_icons():
        icons_path = os.path.join(FRONTEND_DIST, "icons.svg")
        if os.path.exists(icons_path):
            return FileResponse(icons_path)
        return Response(status_code=404)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not catch API endpoints, OpenAPI specs or interactive docs
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return Response(content="Frontend build index.html not found. Run npm run build in frontend.", status_code=404)

