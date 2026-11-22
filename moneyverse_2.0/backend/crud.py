import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import User, IncomeLog, Expense, Goal, AIConversation
import schemas

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_login_id(db: Session, login_id: str) -> Optional[User]:
    return db.query(User).filter(
        (User.username == login_id) | (User.email == login_id)
    ).first()

def create_user(db: Session, user_in: schemas.UserRegister, hashed_password: str) -> User:
    user = User(
        username=user_in.username.strip(),
        email=user_in.email.strip().lower(),
        hashed_password=hashed_password,
        full_name=user_in.full_name or user_in.username,
        preferred_language=user_in.preferred_language or "en",
        monthly_income=float(user_in.monthly_income or 0.0)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Income CRUD
def get_user_incomes(db: Session, user_id: int) -> List[IncomeLog]:
    return db.query(IncomeLog).filter(IncomeLog.user_id == user_id).order_by(IncomeLog.date.desc(), IncomeLog.id.desc()).all()

def add_user_income(db: Session, user_id: int, income_in: schemas.IncomeCreate) -> IncomeLog:
    inc = IncomeLog(
        user_id=user_id,
        amount=income_in.amount,
        source=income_in.source,
        date=income_in.date,
        notes=income_in.notes or ""
    )
    db.add(inc)
    
    # Also update user's baseline monthly income if not set
    user = get_user_by_id(db, user_id)
    if user and user.monthly_income <= 0:
        user.monthly_income = income_in.amount
        db.add(user)
        
    db.commit()
    db.refresh(inc)
    return inc

def delete_user_income(db: Session, user_id: int, income_id: int) -> bool:
    inc = db.query(IncomeLog).filter(IncomeLog.id == income_id, IncomeLog.user_id == user_id).first()
    if inc:
        db.delete(inc)
        db.commit()
        return True
    return False

# Expense CRUD
def get_user_expenses(
    db: Session,
    user_id: int,
    category: Optional[str] = None,
    search: Optional[str] = None
) -> List[Expense]:
    query = db.query(Expense).filter(Expense.user_id == user_id)
    if category and category.lower() != "all":
        query = query.filter(Expense.category.ilike(category))
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Expense.category.ilike(search_filter)) |
            (Expense.notes.ilike(search_filter)) |
            (Expense.payment_method.ilike(search_filter))
        )
    return query.order_by(Expense.date.desc(), Expense.id.desc()).all()

def add_user_expense(db: Session, user_id: int, expense_in: schemas.ExpenseCreate) -> Expense:
    exp = Expense(
        user_id=user_id,
        amount=expense_in.amount,
        category=expense_in.category.strip().title(),
        date=expense_in.date,
        payment_method=expense_in.payment_method or "UPI",
        notes=expense_in.notes or ""
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp

def update_user_expense(
    db: Session,
    user_id: int,
    expense_id: int,
    update_data: schemas.ExpenseUpdate
) -> Optional[Expense]:
    exp = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if not exp:
        return None
    if update_data.amount is not None:
        exp.amount = update_data.amount
    if update_data.category is not None:
        exp.category = update_data.category.strip().title()
    if update_data.date is not None:
        exp.date = update_data.date
    if update_data.payment_method is not None:
        exp.payment_method = update_data.payment_method
    if update_data.notes is not None:
        exp.notes = update_data.notes
    db.commit()
    db.refresh(exp)
    return exp

def delete_user_expense(db: Session, user_id: int, expense_id: int) -> bool:
    exp = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if exp:
        db.delete(exp)
        db.commit()
        return True
    return False

# Goal CRUD & Calculations
def format_goal_out(goal: Goal) -> schemas.GoalOut:
    remaining = max(0.0, float(goal.target_amount) - float(goal.current_amount))
    pct = (float(goal.current_amount) / float(goal.target_amount) * 100) if goal.target_amount > 0 else 100.0
    pct = round(min(100.0, max(0.0, pct)), 1)
    
    months_left = None
    if remaining > 0 and goal.monthly_contribution > 0:
        months_left = math.ceil(remaining / goal.monthly_contribution)
    elif remaining <= 0:
        months_left = 0

    return schemas.GoalOut(
        id=goal.id,
        user_id=goal.user_id,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        monthly_contribution=goal.monthly_contribution,
        target_date=goal.target_date,
        category=goal.category,
        notes=goal.notes,
        remaining_amount=remaining,
        progress_percentage=pct,
        estimated_months_remaining=months_left,
        is_completed=remaining <= 0
    )

def get_user_goals(db: Session, user_id: int) -> List[schemas.GoalOut]:
    goals = db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.id.desc()).all()
    return [format_goal_out(g) for g in goals]

def add_user_goal(db: Session, user_id: int, goal_in: schemas.GoalCreate) -> schemas.GoalOut:
    goal = Goal(
        user_id=user_id,
        name=goal_in.name,
        target_amount=goal_in.target_amount,
        current_amount=goal_in.current_amount or 0.0,
        monthly_contribution=goal_in.monthly_contribution or 0.0,
        target_date=goal_in.target_date or "",
        category=goal_in.category or "Savings",
        notes=goal_in.notes or ""
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return format_goal_out(goal)

def update_user_goal(db: Session, user_id: int, goal_id: int, goal_update: schemas.GoalUpdate) -> Optional[schemas.GoalOut]:
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
    if not goal:
        return None
    if goal_update.name is not None:
        goal.name = goal_update.name
    if goal_update.target_amount is not None:
        goal.target_amount = goal_update.target_amount
    if goal_update.current_amount is not None:
        goal.current_amount = goal_update.current_amount
    if goal_update.monthly_contribution is not None:
        goal.monthly_contribution = goal_update.monthly_contribution
    if goal_update.target_date is not None:
        goal.target_date = goal_update.target_date
    if goal_update.category is not None:
        goal.category = goal_update.category
    if goal_update.notes is not None:
        goal.notes = goal_update.notes
    db.commit()
    db.refresh(goal)
    return format_goal_out(goal)

def delete_user_goal(db: Session, user_id: int, goal_id: int) -> bool:
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
    if goal:
        db.delete(goal)
        db.commit()
        return True
    return False

# Financial Calculation Engine
def calculate_financial_summary(db: Session, user: User) -> schemas.FinancialSummary:
    """
    Computes exact financial summary:
    - Monthly income: User's set monthly income or sum of current month logged incomes
    - Total expenses: Sum of all expenses for user
    - Available balance: Income - Total expenses
    - Income spent percentage: (Total expenses / Income) * 100
    - Highest expense category: Category with maximum aggregate spend
    - Category breakdown: List of categories with amounts and percentages
    - Goals stats: Total target, saved, overall progress percentage
    """
    # 1. Monthly income
    logged_income_sum = db.query(func.sum(IncomeLog.amount)).filter(IncomeLog.user_id == user.id).scalar() or 0.0
    effective_income = user.monthly_income if user.monthly_income > 0 else logged_income_sum
    
    # 2. Total expenses
    expenses = db.query(Expense).filter(Expense.user_id == user.id).all()
    total_expenses = sum(e.amount for e in expenses)

    # 3. Available balance
    available_balance = effective_income - total_expenses

    # 4. Income spent percentage
    spent_pct = (total_expenses / effective_income * 100) if effective_income > 0 else 0.0
    spent_pct = round(spent_pct, 2)

    # 5. Category breakdown & highest category
    cat_map: Dict[str, float] = {}
    for e in expenses:
        cat_map[e.category] = cat_map.get(e.category, 0.0) + e.amount

    category_breakdown: List[schemas.CategoryExpense] = []
    highest_cat = None
    max_cat_amount = -1.0

    for cat, amt in sorted(cat_map.items(), key=lambda x: x[1], reverse=True):
        if amt > max_cat_amount:
            max_cat_amount = amt
            highest_cat = cat
        pct = (amt / total_expenses * 100) if total_expenses > 0 else 0.0
        category_breakdown.append(schemas.CategoryExpense(
            category=cat,
            amount=amt,
            percentage=round(pct, 1)
        ))

    # 6. Goals summary
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    total_target = sum(g.target_amount for g in goals)
    total_saved = sum(g.current_amount for g in goals)
    goals_progress = (total_saved / total_target * 100) if total_target > 0 else 0.0
    active_goals_count = len([g for g in goals if g.current_amount < g.target_amount])

    # 7. Recent transactions (latest 5)
    recent_txns = sorted(expenses, key=lambda x: (x.date, x.id), reverse=True)[:5]
    recent_out = [
        schemas.ExpenseOut(
            id=e.id,
            user_id=e.user_id,
            amount=e.amount,
            category=e.category,
            date=e.date,
            payment_method=e.payment_method,
            notes=e.notes
        ) for e in recent_txns
    ]

    return schemas.FinancialSummary(
        monthly_income=effective_income,
        total_expenses=total_expenses,
        available_balance=available_balance,
        income_spent_percentage=spent_pct,
        highest_expense_category=highest_cat,
        category_breakdown=category_breakdown,
        total_goals_target=total_target,
        total_goals_saved=total_saved,
        goals_progress_percentage=round(goals_progress, 1),
        active_goals_count=active_goals_count,
        recent_transactions=recent_out
    )

# Simulation Engine (Money Mirror)
def simulate_purchase(summary: schemas.FinancialSummary, item_name: str, purchase_amount: float) -> Dict[str, Any]:
    projected_balance = summary.available_balance - purchase_amount
    projected_expenses = summary.total_expenses + purchase_amount
    projected_spent_pct = (projected_expenses / summary.monthly_income * 100) if summary.monthly_income > 0 else 100.0

    can_afford = projected_balance >= 0
    
    # Assess risk level
    if projected_balance < 0:
        risk_level = "Critical"
    elif projected_spent_pct > 80:
        risk_level = "High"
    elif projected_spent_pct > 50:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    # Goal impact
    if summary.total_goals_target > 0:
        goal_impact = f"Using ₹{purchase_amount:,.0f} may delay your savings goals by up to {math.ceil(purchase_amount / 2000)} weeks."
    else:
        goal_impact = "No active savings goals detected to delay."

    return {
        "item_name": item_name,
        "purchase_amount": purchase_amount,
        "current_balance": summary.available_balance,
        "projected_balance": projected_balance,
        "current_spent_percentage": summary.income_spent_percentage,
        "projected_spent_percentage": round(projected_spent_pct, 1),
        "can_afford": can_afford,
        "risk_level": risk_level,
        "impact_on_goals": goal_impact
    }
