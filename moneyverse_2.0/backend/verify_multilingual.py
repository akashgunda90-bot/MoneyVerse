import json
import httpx
import re

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

# Authenticate
login_res = client.post("/api/auth/login", json={
    "login_id": "fintech_target_scenario",
    "password": "password123"
})
assert login_res.status_code == 200
token = login_res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

languages = [
    ("en", "English"),
    ("kn", "Kannada"),
    ("hi", "Hindi"),
    ("ta", "Tamil"),
    ("te", "Telugu"),
]

print("=" * 60)
print("1. TESTING LANGUAGE PERSISTENCE ACROSS ALL 5 LANGUAGES")
print("=" * 60)

for code, name in languages:
    # Update profile
    up_res = client.put("/api/auth/profile", headers=headers, json={"preferred_language": code})
    assert up_res.status_code == 200, f"Failed updating language to {code}"
    user_data = up_res.json()
    assert user_data["preferred_language"] == code

    # Verify session retrieval (/auth/me) reflects the language
    me_res = client.get("/api/auth/me", headers=headers).json()
    assert me_res["preferred_language"] == code
    print(f"[{code.upper()}] {name}: Successfully updated & persisted in SQLite database!")

print("\n" + "=" * 60)
print("2. TESTING AI ANSWERS ACROSS LANGUAGES")
print("=" * 60)

test_questions = {
    "en": "How can I start saving for an emergency fund?",
    "kn": "ತುರ್ತು ನಿಧಿಗಾಗಿ ಹಣವನ್ನು ಹೇಗೆ ಉಳಿಸುವುದು?",
    "hi": "आपातकालीन फंड के लिए पैसे कैसे बचाएं?",
    "ta": "அவசரகால நிதிக்கு பணத்தை எவ்வாறு சேமிப்பது?",
    "te": "ఎమర్జెన్సీ ఫండ్ కోసం డబ్బు ఎలా ఆదా చేయాలి?",
}

for code, name in languages:
    q = test_questions[code]
    print(f"\n--- Testing AI Generation for {name} ({code}) ---")
    print(f"Question: {q}")
    
    chat_res = client.post("/api/ai/voice-chat", headers=headers, json={
        "message": q,
        "language": code,
        "include_audio": False
    }).json()

    assert chat_res["success"] is True, f"Chat failed for {code}: {chat_res.get('error')}"
    response_text = chat_res.get("response_text", "")
    print(f"AI Answer ({name}):\n{response_text[:180]}...")
    assert len(response_text) > 10

print("\n" + "=" * 60)
print("ALL 5 LANGUAGES VERIFIED SUCCESSFULLY WITH PERSISTENCE & AI GENERATION!")
print("=" * 60)
