import httpx

client = httpx.Client(base_url="http://127.0.0.1:8000")

# 1. Register test user with ₹20,000 income
username = "fintech_target_scenario"
reg_res = client.post("/api/auth/register", json={
    "username": username,
    "email": "scenario_target@moneyverse.com",
    "password": "password123",
    "full_name": "Scenario User",
    "preferred_language": "en",
    "monthly_income": 20000.0
})

if reg_res.status_code == 200:
    token = reg_res.json()["token"]
else:
    token = client.post("/api/auth/login", json={"login_id": username, "password": "password123"}).json()["token"]

headers = {"Authorization": f"Bearer {token}"}

# Clean any existing expenses/goals for this user
existing_exp = client.get("/api/expenses", headers=headers).json()
for e in existing_exp:
    eid = e["id"]
    client.delete(f"/api/expenses/{eid}", headers=headers)

existing_goals = client.get("/api/goals", headers=headers).json()
for g in existing_goals:
    gid = g["id"]
    client.delete(f"/api/goals/{gid}", headers=headers)

# 2. Add Food expense: ₹5,000
res_food = client.post("/api/expenses", headers=headers, json={
    "amount": 5000.0,
    "category": "Food",
    "date": "2026-11-20",
    "payment_method": "UPI",
    "notes": "Groceries and food supplies"
})
assert res_food.status_code == 200, res_food.text
food_id = res_food.json()["id"]

# 3. Add Travel expense: ₹3,000
res_travel = client.post("/api/expenses", headers=headers, json={
    "amount": 3000.0,
    "category": "Travel",
    "date": "2026-11-21",
    "payment_method": "Metro / Fuel",
    "notes": "Work commute"
})
assert res_travel.status_code == 200, res_travel.text
travel_id = res_travel.json()["id"]

# 4. Query Financial Summary
summary = client.get("/api/financial/summary", headers=headers).json()
print("=" * 50)
print("       SCENARIO VERIFICATION RESULTS (LIVE HTTP)  ")
print("=" * 50)
print(f"Monthly Income:         ₹{summary['monthly_income']:,.2f}")
print(f"Total Expenses:         ₹{summary['total_expenses']:,.2f}")
print(f"Available Balance:      ₹{summary['available_balance']:,.2f}")
print(f"Income Spent (%):       {summary['income_spent_percentage']:.1f}%")
print(f"Highest Category:       {summary['highest_expense_category']}")
print("=" * 50)

# ASSERT EXACT USER SPECIFIED METRICS:
assert summary["monthly_income"] == 20000.0, f"Expected 20000, got {summary['monthly_income']}"
assert summary["total_expenses"] == 8000.0, f"Expected 8000, got {summary['total_expenses']}"
assert summary["available_balance"] == 12000.0, f"Expected 12000, got {summary['available_balance']}"
assert summary["income_spent_percentage"] == 40.0, f"Expected 40.0, got {summary['income_spent_percentage']}"
assert summary["highest_expense_category"] == "Food", f"Expected Food, got {summary['highest_expense_category']}"

# 5. Test Goal Bridge
goal_res = client.post("/api/goals", headers=headers, json={
    "name": "Laptop Upgrade",
    "target_amount": 60000.0,
    "current_amount": 24000.0,
    "monthly_contribution": 6000.0,
    "target_date": "2027-05-01",
    "category": "Electronics"
}).json()
assert goal_res["remaining_amount"] == 36000.0
assert goal_res["progress_percentage"] == 40.0
assert goal_res["estimated_months_remaining"] == 6
print("Goal Bridge Target ₹60k, Saved ₹24k -> Remaining ₹36k (40% progress, 6 months left): PASSED")

# 6. Test Money Mirror Purchase Simulation
mirror_res = client.post("/api/ai/simulate-purchase", headers=headers, json={
    "item_name": "Smart Watch",
    "purchase_amount": 4000.0,
    "category": "Shopping"
}).json()
assert mirror_res["current_balance"] == 12000.0
assert mirror_res["projected_balance"] == 8000.0
assert mirror_res["current_spent_percentage"] == 40.0
assert mirror_res["projected_spent_percentage"] == 60.0
print("Money Mirror Simulator (Buying ₹4,000 item): Balance drops to ₹8,000, Spent becomes 60%: PASSED")

# 7. Test Reports CSV Export
csv_res = client.get("/api/reports/export-csv", headers=headers)
assert csv_res.status_code == 200
csv_text = csv_res.text
assert "20000.00" in csv_text
assert "8000.00" in csv_text
assert "12000.00" in csv_text
assert "40.00%" in csv_text
assert "Food" in csv_text
assert "Travel" in csv_text
print("Reports CSV Export: Successfully verified!")

# 8. Test Edit and Delete
edit_res = client.put(f"/api/expenses/{travel_id}", headers=headers, json={"amount": 4000.0})
assert edit_res.status_code == 200
updated_summary = client.get("/api/financial/summary", headers=headers).json()
assert updated_summary["total_expenses"] == 9000.0
assert updated_summary["available_balance"] == 11000.0
print("Edit Expense: Updated travel to ₹4,000 -> Total ₹9,000, Balance ₹11,000: PASSED")

# Restore back to 3000
client.put(f"/api/expenses/{travel_id}", headers=headers, json={"amount": 3000.0})
final_summary = client.get("/api/financial/summary", headers=headers).json()
assert final_summary["total_expenses"] == 8000.0
assert final_summary["available_balance"] == 12000.0
assert final_summary["income_spent_percentage"] == 40.0
print("Final check restored: ₹20k income, ₹8k expenses = ₹12k balance, 40% spent: PASSED")
