import os
import io
import base64
from typing import Dict, Any, List, Optional
import httpx
from gtts import gTTS

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

LANGUAGE_PROMPTS = {
    "en": "You are Moneyverse AI, a professional, friendly, and practical personal finance advisor. Respond clearly and concisely in modern English with practical budgeting, savings, and expense advice.",
    "kn": "ನೀವು Moneyverse AI, ವೃತ್ತಿಪರ ಹಾಗೂ ಸ್ನೇಹಿತನಂತಿರುವ ವೈಯಕ್ತಿಕ ಹಣಕಾಸು ಸಲಹೆಗಾರರು. ಅತಿಯಾದ ಕಠಿಣ ಪದಗಳನ್ನು ಬಳಸದೆ, ದೈನಂದಿನ ಸರಳ ಕನ್ನಡದಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಮತ್ತು ಸಹಾಯಕವಾಗಿ ಉತ್ತರಿಸಿ.",
    "hi": "आप Moneyverse AI हैं, एक पेशेवर और व्यावहारिक वित्तीय सलाहकार। बहुत कठिन शब्दों के बिना, सरल और स्पष्ट हिंदी में व्यावहारिक सलाह दें।",
    "ta": "நீங்கள் Moneyverse AI, ஒரு சிறந்த நிதி ஆலோசகர். கடினமான சொற்கள் இல்லாமல், அன்றாட எளிய தமிழில் பயனுள்ள மற்றும் தெளிவான ஆலோசனைகளை வழங்கவும்.",
    "te": "మీరు Moneyverse AI, ఒక తెలివైన వ్యక్తిగత ఆర్థిక సలహాదారు. క్లిష్టమైన భాష కాకుండా, రోజువారీ ఉపయోగించే సులభమైన తెలుగులో స్పష్టమైన సలహాలు ఇవ్వండి."
}

LANG_NAME_MAP = {
    "en": "English",
    "kn": "Kannada (ಕನ್ನಡ)",
    "hi": "Hindi (हिन्दी)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)"
}

async def check_ollama_status() -> Dict[str, Any]:
    """Check whether local Ollama instance is reachable and which models are available."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                has_target = any(DEFAULT_MODEL in m for m in models)
                return {
                    "is_connected": True,
                    "model": DEFAULT_MODEL,
                    "available_models": models,
                    "target_model_installed": has_target,
                    "message": "Ollama is running smoothly" if has_target else f"Ollama is running, but {DEFAULT_MODEL} is not loaded yet."
                }
    except Exception:
        pass
    return {
        "is_connected": False,
        "model": DEFAULT_MODEL,
        "available_models": [],
        "target_model_installed": False,
        "message": f"Ollama is not reachable at {OLLAMA_BASE_URL}. Ensure 'ollama serve' is running."
    }

async def query_ollama(prompt: str, system_prompt: str = "", model: str = DEFAULT_MODEL, timeout_seconds: float = 30.0) -> Dict[str, Any]:
    """Call Ollama /api/generate with pre-flight connection check and clear status error messages."""
    status_check = await check_ollama_status()
    if not status_check["is_connected"]:
        return {
            "success": False,
            "response": "",
            "error": "Could not connect to Ollama on http://127.0.0.1:11434. Please verify that the Ollama service is running."
        }

    payload = {
        "model": model,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 400
        }
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                response_text = data.get("response", "").strip()
                return {"success": True, "response": response_text, "error": None}
            else:
                return {
                    "success": False,
                    "response": "",
                    "error": f"Ollama returned HTTP error {resp.status_code}: {resp.text}"
                }
    except httpx.ConnectError:
        return {
            "success": False,
            "response": "",
            "error": "Could not connect to Ollama on http://127.0.0.1:11434. Please verify that the Ollama service is running."
        }
    except httpx.ReadTimeout:
        return {
            "success": False,
            "response": "",
            "error": "Ollama response timed out. The local model took too long to generate a response."
        }
    except Exception as e:
        return {
            "success": False,
            "response": "",
            "error": f"Unexpected error while querying AI: {str(e)}"
        }

async def generate_financial_insights(financial_summary: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """Generate personalized financial insights and recommendations based on real user numbers."""
    sys_prompt = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["en"])
    
    income = financial_summary.get("monthly_income", 0.0)
    expenses = financial_summary.get("total_expenses", 0.0)
    balance = financial_summary.get("available_balance", 0.0)
    spent_pct = financial_summary.get("income_spent_percentage", 0.0)
    highest_cat = financial_summary.get("highest_expense_category", "None")
    categories = financial_summary.get("category_breakdown", [])
    goals_target = financial_summary.get("total_goals_target", 0.0)
    goals_saved = financial_summary.get("total_goals_saved", 0.0)

    cat_str = ", ".join([f"{c['category']}: ₹{c['amount']:,.0f} ({c['percentage']:.1f}%)" for c in categories]) if categories else "No expenses recorded yet"

    prompt = f"""
Analyze this user's current monthly finances and give 3 to 4 specific, actionable recommendations:
- Monthly Income: ₹{income:,.2f}
- Total Expenses: ₹{expenses:,.2f}
- Available Balance: ₹{balance:,.2f}
- Income Spent Percentage: {spent_pct:.1f}%
- Highest Expense Category: {highest_cat}
- Category Breakdown: {cat_str}
- Savings Goals Target: ₹{goals_target:,.2f} (Saved: ₹{goals_saved:,.2f})

Format your response cleanly:
1. Quick Financial Health Assessment (1-2 sentences)
2. 3 Actionable Tips (bullet points with numbers)
3. Encouragement (1 sentence)
Do not use complicated jargon.
CRITICAL: Respond completely and naturally in {LANG_NAME_MAP.get(language, 'English')}.
"""
    result = await query_ollama(prompt, system_prompt=sys_prompt)
    return result

async def generate_mirror_verdict(financial_summary: Dict[str, Any], item_name: str, purchase_amount: float, language: str = "en") -> Dict[str, Any]:
    """Money Mirror purchase simulator AI evaluation."""
    sys_prompt = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["en"])

    income = financial_summary.get("monthly_income", 0.0)
    expenses = financial_summary.get("total_expenses", 0.0)
    current_balance = financial_summary.get("available_balance", 0.0)
    projected_balance = current_balance - purchase_amount
    projected_expenses = expenses + purchase_amount
    projected_spent_pct = (projected_expenses / income * 100) if income > 0 else 100.0

    target_lang = LANG_NAME_MAP.get(language, 'English')
    prompt = f"""
The user is considering purchasing '{item_name}' for ₹{purchase_amount:,.2f}.
Current Financial State:
- Monthly Income: ₹{income:,.2f}
- Current Expenses: ₹{expenses:,.2f}
- Available Balance: ₹{current_balance:,.2f}
If purchased:
- New Available Balance: ₹{projected_balance:,.2f}
- Projected Income Spent: {projected_spent_pct:.1f}%

Provide:
1. Verdict: Choose exactly one tag: [SAFE TO BUY] or [WAIT & SAVE] or [AVOID FOR NOW]
2. Detailed reasoning (2-3 concise sentences on affordability, impact on emergency cushion or savings goals)
3. Smart alternative suggestion (e.g. wait 30 days, look for discount, or save ₹X per week).
CRITICAL: Write your entire reasoning and suggestion in {target_lang}. Keep the bracketed tag [SAFE TO BUY] / [WAIT & SAVE] / [AVOID FOR NOW] intact.
"""
    result = await query_ollama(prompt, system_prompt=sys_prompt)
    return result

async def chat_with_advisor(
    financial_summary: Dict[str, Any],
    user_message: str,
    conversation_history: List[Dict[str, str]],
    language: str = "en"
) -> Dict[str, Any]:
    """Money Voice and general chat financial assistant."""
    sys_prompt = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["en"])
    target_lang = LANG_NAME_MAP.get(language, "English")
    
    income = financial_summary.get("monthly_income", 0.0)
    expenses = financial_summary.get("total_expenses", 0.0)
    balance = financial_summary.get("available_balance", 0.0)
    highest_cat = financial_summary.get("highest_expense_category", "None")

    context_str = f"User's Financial Profile: Monthly Income: ₹{income:,.0f}, Expenses: ₹{expenses:,.0f}, Balance: ₹{balance:,.0f}, Top Expense: {highest_cat}.\n"
    
    history_str = ""
    if conversation_history:
        for item in conversation_history[-4:]:
            role = "User" if item.get("role") == "user" else "Advisor"
            history_str += f"{role}: {item.get('message', '')}\n"

    full_prompt = (
        f"{context_str}\n"
        f"Conversation History:\n{history_str}"
        f"User asks: {user_message}\n\n"
        f"INSTRUCTION: You are the Advisor. Reply directly to the user in 2 to 3 practical, helpful sentences. "
        f"CRITICAL: You must reply ONLY in {target_lang}. Do NOT include 'User:' or 'Advisor:' dialogue labels. Just provide your direct helpful answer."
    )
    result = await query_ollama(full_prompt, system_prompt=sys_prompt)
    return result

def text_to_speech_base64(text: str, language: str = "en") -> Optional[str]:
    """Fallback text-to-speech audio generation using gTTS returning base64 mp3."""
    lang_map = {
        "en": "en",
        "kn": "kn",
        "hi": "hi",
        "ta": "ta",
        "te": "te"
    }
    gtts_lang = lang_map.get(language, "en")
    try:
        clean_text = text.replace("*", "").replace("#", "").replace("[", "").replace("]", "")
        if len(clean_text) > 300:
            clean_text = clean_text[:300] + "..."
        tts = gTTS(text=clean_text, lang=gtts_lang, slow=False)
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        audio_b64 = base64.b64encode(mp3_fp.read()).decode("utf-8")
        return audio_b64
    except Exception:
        return None

def transcribe_audio_bytes(audio_bytes: bytes, language: str = "en") -> Dict[str, Any]:
    """Transcribe recorded audio bytes (from browser MediaRecorder or upload)."""
    lang_map = {
        "en": "en-IN",
        "kn": "kn-IN",
        "hi": "hi-IN",
        "ta": "ta-IN",
        "te": "te-IN"
    }
    target_lang = lang_map.get(language, "en-IN")
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()
        with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language=target_lang)
            return {"success": True, "text": text, "error": None}
    except Exception as e:
        return {"success": False, "text": "", "error": str(e)}

