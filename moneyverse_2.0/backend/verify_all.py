import httpx
import sys

BASE = 'http://127.0.0.1:8000'

client = httpx.Client(base_url=BASE, timeout=60.0)

# 1. Health
r = client.get('/api/health')
assert r.status_code == 200, f'Health failed: {r.text}'
print('PASS: /api/health -> healthy')

# 2. Ollama status
r = client.get('/api/ai/status')
assert r.status_code == 200
ai_data = r.json()
print(f"PASS: /api/ai/status -> connected={ai_data['is_connected']}, model={ai_data['model']}")

# 3. Registration with test domain (RFC 2606 test)
reg_payload = {
    'username': 'strict_tester',
    'email': 'tester@sandbox.test',
    'password': 'password123',
    'full_name': 'Strict Tester',
    'preferred_language': 'en',
    'monthly_income': 20000.0
}
client.post('/api/auth/register', json=reg_payload)
r_login = client.post('/api/auth/login', json={'login_id': 'strict_tester', 'password': 'password123'})
assert r_login.status_code == 200, f'Login failed: {r_login.text}'
token = r_login.json()['token']
headers = {'Authorization': f'Bearer {token}'}
print('PASS: /api/auth/register & /api/auth/login -> authenticated')

# 4. Clean user expenses & incomes for exact scenario test
exps = client.get('/api/expenses', headers=headers).json()
for e in exps:
    client.delete(f"/api/expenses/{e['id']}", headers=headers)
incs = client.get('/api/incomes', headers=headers).json()
for i in incs:
    client.delete(f"/api/incomes/{i['id']}", headers=headers)

# Add exact scenario: Income = 20,000, Expenses = 5,000 (Food) + 3,000 (Travel) = 8,000
r_inc = client.post('/api/incomes', headers=headers, json={
    'amount': 20000.0,
    'source': 'Salary',
    'date': '2026-11-01',
    'notes': 'Monthly Pay'
})
assert r_inc.status_code == 200

r_e1 = client.post('/api/expenses', headers=headers, json={
    'amount': 5000.0,
    'category': 'Food',
    'date': '2026-11-10',
    'payment_method': 'UPI',
    'notes': 'Groceries'
})
assert r_e1.status_code == 200

r_e2 = client.post('/api/expenses', headers=headers, json={
    'amount': 3000.0,
    'category': 'Travel',
    'date': '2026-11-12',
    'payment_method': 'Cash',
    'notes': 'Commute'
})
assert r_e2.status_code == 200

# 5. Financial Calculation Verification
r_sum = client.get('/api/financial/summary', headers=headers)
assert r_sum.status_code == 200
summary = r_sum.json()
assert summary['monthly_income'] == 20000.0, f"Expected 20000, got {summary['monthly_income']}"
assert summary['total_expenses'] == 8000.0, f"Expected 8000, got {summary['total_expenses']}"
assert summary['available_balance'] == 12000.0, f"Expected 12000, got {summary['available_balance']}"
assert summary['income_spent_percentage'] == 40.0, f"Expected 40.0, got {summary['income_spent_percentage']}"
print('PASS: Financial calculations -> Income: 20,000, Expenses: 8,000, Balance: 12,000, Spent%: 40.0%')

# 6. Goals CRUD & Calculations
r_g = client.post('/api/goals', headers=headers, json={
    'name': 'Laptop Upgrade',
    'target_amount': 60000.0,
    'current_amount': 15000.0,
    'monthly_contribution': 5000.0,
    'target_date': '2027-06-30',
    'category': 'Gadgets'
})
assert r_g.status_code == 200
goal = r_g.json()
assert goal['progress_percentage'] == 25.0, f"Expected 25.0, got {goal['progress_percentage']}"
assert goal['remaining_amount'] == 45000.0
assert goal['estimated_months_remaining'] == 9.0
print('PASS: Goal calculations -> 25% progress, 9 months remaining')

# 7. Edit & Delete Expense
r_up = client.put(f"/api/expenses/{r_e1.json()['id']}", headers=headers, json={'amount': 6000.0})
assert r_up.status_code == 200 and r_up.json()['amount'] == 6000.0
r_revert = client.put(f"/api/expenses/{r_e1.json()['id']}", headers=headers, json={'amount': 5000.0})
assert r_revert.status_code == 200
print('PASS: Expense PUT update verified')

# 8. CSV Export
r_csv = client.get('/api/reports/export-csv', headers=headers)
assert r_csv.status_code == 200
assert 'MONEYVERSE' in r_csv.text and 'Food' in r_csv.text and 'Travel' in r_csv.text
print('PASS: /api/reports/export-csv -> successfully generated ledger with data')

# 9. Two-User Isolation Security Test
reg_b = {
    'username': 'user_b_isolation',
    'email': 'user_b@isolation.test',
    'password': 'password123',
    'monthly_income': 10000.0
}
client.post('/api/auth/register', json=reg_b)
r_log_b = client.post('/api/auth/login', json={'login_id': 'user_b_isolation', 'password': 'password123'})
tok_b = r_log_b.json()['token']
headers_b = {'Authorization': f'Bearer {tok_b}'}

# User B tries to view or delete User A's expense
r_cross_del = client.delete(f"/api/expenses/{r_e1.json()['id']}", headers=headers_b)
assert r_cross_del.status_code == 404, f'Expected 404 on cross-user delete, got {r_cross_del.status_code}'
# User B's summary must NOT contain User A's data
r_sum_b = client.get('/api/financial/summary', headers=headers_b)
assert r_sum_b.json()['total_expenses'] == 0.0, 'User B saw User A expenses!'
print('PASS: Multi-user isolation -> User B cannot access or mutate User A data (returns 404)')

# 10. AI Real Generation Tests
print('Testing Ollama AI endpoints (real model generation)...')
# Insights
r_ins = client.post('/api/ai/insights', headers=headers)
assert r_ins.status_code == 200
ins_data = r_ins.json()
assert ins_data['success'] is True
assert len(ins_data['insights']) > 40
print(f"PASS: /api/ai/insights -> generated {len(ins_data['insights'])} chars")

# Mirror Simulation
r_mir = client.post('/api/ai/simulate-purchase', headers=headers, json={
    'item_name': 'Flagship Smartphone',
    'purchase_amount': 50000.0,
    'category': 'Shopping'
})
assert r_mir.status_code == 200
mir_data = r_mir.json()
assert mir_data['can_afford'] is False
assert 'WAIT' in mir_data['ai_verdict'] or 'AVOID' in mir_data['ai_verdict'] or 'SAFE' in mir_data['ai_verdict']
print(f"PASS: /api/ai/simulate-purchase -> verdict={mir_data['ai_verdict']}, risk={mir_data['risk_level']}")

# Multilingual AI chat
for lang_code, lang_sample in [
    ('en', 'How can I save more money?'),
    ('kn', 'ನನ್ನ ಖರ್ಚು ಕಡಿಮೆ ಮಾಡಲು ಸಲಹೆ ಕೊಡಿ'),
    ('hi', 'पैसे कैसे बचाएं?'),
    ('ta', 'பணத்தை எவ்வாறு சேமிப்பது?'),
    ('te', 'ఖర్చులు ఎలా తగ్గించాలి?')
]:
    r_vc = client.post('/api/ai/voice-chat', headers=headers, json={
        'message': lang_sample,
        'language': lang_code,
        'include_audio': False
    })
    assert r_vc.status_code == 200
    vc_data = r_vc.json()
    assert vc_data['success'] is True
    assert len(vc_data['response_text']) > 20
    print(f"PASS: /api/ai/voice-chat [{lang_code}] -> responded with {len(vc_data['response_text'])} chars")

print('\nALL AUTOMATED TESTS PASSED SUCCESSFULLY! 100% HEALTHY')
