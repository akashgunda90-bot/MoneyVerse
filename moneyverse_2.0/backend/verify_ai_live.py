import httpx
import time

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

# Authenticate as user with real financial records
login_res = client.post("/api/auth/login", json={
    "login_id": "fintech_target_scenario",
    "password": "password123"
})
assert login_res.status_code == 200, f"Login failed: {login_res.text}"
token = login_res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

print("=" * 60)
print("1. TESTING REAL OLLAMA STATUS CHECK")
print("=" * 60)
status_res = client.get("/api/ai/status").json()
print("Ollama Status:", status_res)
assert status_res["is_connected"] is True
assert status_res["model"] == "qwen2.5:3b"

print("\n" + "=" * 60)
print("2. TESTING REAL 'GENERATE AI INSIGHTS' (OLLAMA qwen2.5:3b)")
print("=" * 60)
start_time = time.time()
insights_res = client.post("/api/ai/insights", headers=headers).json()
elapsed = time.time() - start_time

print(f"Response received in {elapsed:.2f} seconds:")
print("Success:", insights_res.get("success"))
print("Model:", insights_res.get("model"))
print("Generated Insights:\n" + "-" * 40)
print(insights_res.get("insights"))
print("-" * 40)

assert insights_res["success"] is True, f"AI generation failed: {insights_res.get('error')}"
assert len(insights_res["insights"]) > 30, "Generated insights text is too short!"
assert insights_res["model"] == "qwen2.5:3b"

print("\n" + "=" * 60)
print("3. TESTING REAL 'MONEY VOICE' CHAT (ENGLISH)")
print("=" * 60)
voice_en_res = client.post("/api/ai/voice-chat", headers=headers, json={
    "message": "Can I afford to buy a ₹2,000 gaming headset right now?",
    "language": "en",
    "include_audio": False
}).json()

print("User Question: 'Can I afford to buy a ₹2,000 gaming headset right now?'")
print("AI Response:\n" + "-" * 40)
print(voice_en_res.get("response_text"))
print("-" * 40)
assert voice_en_res["success"] is True
assert len(voice_en_res["response_text"]) > 20

print("\n" + "=" * 60)
print("4. TESTING REAL 'MONEY VOICE' CHAT (KANNADA)")
print("=" * 60)
voice_kn_res = client.post("/api/ai/voice-chat", headers=headers, json={
    "message": "ನನ್ನ ಬಳಿ ಎಷ್ಟು ಉಳಿತಾಯ ಮಾಡುವುದು ಸೂಕ್ತ?",
    "language": "kn",
    "include_audio": False
}).json()

print("User Question in Kannada: 'ನನ್ನ ಬಳಿ ಎಷ್ಟು ಉಳಿತಾಯ ಮಾಡುವುದು ಸೂಕ್ತ?'")
print("AI Response in Kannada:\n" + "-" * 40)
print(voice_kn_res.get("response_text"))
print("-" * 40)
assert voice_kn_res["success"] is True
assert len(voice_kn_res["response_text"]) > 10

print("\nALL REAL OLLAMA AI GENERATION TESTS PASSED WITH ACTUAL GENERATED CONTENT!")
