import sys
import os
import pytest
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import database
from database import Base, User, IncomeLog, Expense, Goal, UserSession
import crud
import schemas
import auth
import ai
import main

# Test database
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_moneyverse2.db"))
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except:
            pass

@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_health_check_endpoint():
    result = asyncio.run(main.health_check())
    assert result["status"] == "healthy"
    assert result["app"] == "MONEYVERSE 2.0"
    assert result["version"] == "2.0.0"

def test_user_registration_and_authentication(db):
    # 1. Register User
    reg_data = schemas.UserRegister(
        username="fintech_pioneer",
        email="pioneer@moneyverse.com",
        password="securePassword999",
        full_name="Pioneer User",
        preferred_language="en",
        monthly_income=25000.0
    )
    auth_res = main.register(reg_data, db=db)
    assert auth_res.token is not None
    assert auth_res.user.username == "fintech_pioneer"
    assert auth_res.user.monthly_income == 25000.0

    # 2. Login User
    login_data = schemas.UserLogin(
        login_id="fintech_pioneer",
        password="securePassword999"
    )
    login_res = main.login(login_data, db=db)
    assert login_res.token is not None
    assert login_res.user.email == "pioneer@moneyverse.com"

    # 3. Verify password verification logic
    user_record = crud.get_user_by_username(db, "fintech_pioneer")
    assert auth.verify_password("securePassword999", user_record.hashed_password) is True
    assert auth.verify_password("wrongPassword", user_record.hashed_password) is False

    # 4. Verify token session resolution
    current_user = auth.get_current_user(f"Bearer {login_res.token}", db=db)
    assert current_user.id == user_record.id

def test_required_scenario_financial_calculations(db):
    """
    TEST SCENARIO SPECIFIED BY USER:
    Monthly income: ₹20,000
    Food expense: ₹5,000
    Travel expense: ₹3,000
    Expected:
    - Total expenses: ₹8,000
    - Available balance: ₹12,000
    - Income spent: 40%
    - Highest expense category: Food
    """
    # 1. Create user with baseline income ₹20,000
    user_in = schemas.UserRegister(
        username="scenario_tester",
        email="scenario@test.com",
        password="scenarioPassword123",
        full_name="Scenario Tester",
        preferred_language="en",
        monthly_income=20000.0
    )
    auth_res = main.register(user_in, db=db)
    user = crud.get_user_by_id(db, auth_res.user.id)
    assert user is not None

    # 2. Add Food expense: ₹5,000
    food_in = schemas.ExpenseCreate(
        amount=5000.0,
        category="Food",
        date="2026-11-20",
        payment_method="UPI",
        notes="Groceries and meals"
    )
    food_exp = crud.add_user_expense(db, user.id, food_in)
    assert food_exp.amount == 5000.0

    # 3. Add Travel expense: ₹3,000
    travel_in = schemas.ExpenseCreate(
        amount=3000.0,
        category="Travel",
        date="2026-11-21",
        payment_method="Metro",
        notes="Commute and fuel"
    )
    travel_exp = crud.add_user_expense(db, user.id, travel_in)
    assert travel_exp.amount == 3000.0

    # 4. Calculate Financial Summary
    summary = crud.calculate_financial_summary(db, user)

    # STRICT ASSERTIONS AS REQUIRED:
    assert summary.monthly_income == 20000.0, f"Expected 20000, got {summary.monthly_income}"
    assert summary.total_expenses == 8000.0, f"Expected 8000, got {summary.total_expenses}"
    assert summary.available_balance == 12000.0, f"Expected 12000, got {summary.available_balance}"
    assert summary.income_spent_percentage == 40.0, f"Expected 40.0%, got {summary.income_spent_percentage}"
    assert summary.highest_expense_category == "Food", f"Expected Food, got {summary.highest_expense_category}"

    # Verify category breakdown percentages:
    # Food: 5000 / 8000 = 62.5%
    # Travel: 3000 / 8000 = 37.5%
    cat_map = {c.category: c for c in summary.category_breakdown}
    assert "Food" in cat_map
    assert cat_map["Food"].amount == 5000.0
    assert cat_map["Food"].percentage == 62.5

    assert "Travel" in cat_map
    assert cat_map["Travel"].amount == 3000.0
    assert cat_map["Travel"].percentage == 37.5

def test_goal_bridge_calculations(db):
    user = crud.get_user_by_username(db, "scenario_tester")

    # Target: 50,000, Saved: 20,000, Monthly contribution: 5,000
    goal_in = schemas.GoalCreate(
        name="Emergency Fund",
        target_amount=50000.0,
        current_amount=20000.0,
        monthly_contribution=5000.0,
        target_date="2027-06-01",
        category="Savings"
    )
    goal = crud.add_user_goal(db, user.id, goal_in)

    assert goal.remaining_amount == 30000.0
    assert goal.progress_percentage == 40.0
    assert goal.estimated_months_remaining == 6
    assert goal.is_completed == False

    # Update goal to 50,000 (Goal Achieved)
    updated = crud.update_user_goal(
        db, user.id, goal.id,
        schemas.GoalUpdate(current_amount=50000.0)
    )
    assert updated.remaining_amount == 0.0
    assert updated.progress_percentage == 100.0
    assert updated.is_completed == True
    assert updated.estimated_months_remaining == 0

def test_money_mirror_simulation(db):
    user = crud.get_user_by_username(db, "scenario_tester")
    summary = crud.calculate_financial_summary(db, user)

    # Balance is ₹12,000. Propose buying a ₹4,000 gadget
    sim = crud.simulate_purchase(summary, item_name="Wireless Earbuds", purchase_amount=4000.0)

    assert sim["item_name"] == "Wireless Earbuds"
    assert sim["purchase_amount"] == 4000.0
    assert sim["current_balance"] == 12000.0
    assert sim["projected_balance"] == 8000.0
    assert sim["current_spent_percentage"] == 40.0
    assert sim["projected_spent_percentage"] == 60.0  # (8000 + 4000) / 20000 = 60%
    assert sim["can_afford"] == True
    assert sim["risk_level"] in ["Low", "Moderate"]

    # Propose buying ₹15,000 item (deficit scenario)
    sim_deficit = crud.simulate_purchase(summary, item_name="Luxury Watch", purchase_amount=15000.0)
    assert sim_deficit["projected_balance"] == -3000.0
    assert sim_deficit["can_afford"] == False
    assert sim_deficit["risk_level"] == "Critical"

def test_multilingual_language_switching_and_persistence(db):
    user = crud.get_user_by_username(db, "scenario_tester")

    # Cycle through all 5 required languages: Kannada, Hindi, Tamil, Telugu, English
    languages = ["kn", "hi", "ta", "te", "en"]
    for lang in languages:
        updated_user = main.update_profile(
            schemas.UserProfileUpdate(preferred_language=lang),
            user=user,
            db=db
        )
        assert updated_user.preferred_language == lang

        # Verify from database directly
        db_user = crud.get_user_by_id(db, user.id)
        assert db_user.preferred_language == lang

def test_ai_status_and_offline_handling():
    # Test checking Ollama status
    status_info = asyncio.run(ai.check_ollama_status())
    assert "is_connected" in status_info
    assert "model" in status_info
    assert status_info["model"] == "qwen2.5:3b"

    # Test that querying Ollama with unreachable URL fails safely without crashing
    res = asyncio.run(ai.query_ollama("Test Prompt", model="qwen2.5:3b", timeout_seconds=1.0))
    assert "success" in res
    assert "response" in res
    assert "error" in res
    # If Ollama is offline or online, format is well-formed
    if not res["success"]:
        assert res["error"] is not None

def test_reports_csv_generation(db):
    user = crud.get_user_by_username(db, "scenario_tester")
    csv_response = main.export_csv(user=user, db=db)
    content = csv_response.body.decode("utf-8")

    assert "MONEYVERSE 2.0 - FINANCIAL REPORT" in content
    assert "scenario_tester" in content
    assert "Food" in content
    assert "5000.00" in content
    assert "Travel" in content
    assert "3000.00" in content
    assert "Available Balance" in content
    assert "12000.00" in content

def test_two_separate_users_isolation_and_security(db):
    """
    CRITICAL REQUIREMENT:
    Verify that two separate users have strictly isolated SQLite records.
    Neither user can view, update, delete, or calculate finances of the other.
    """
    # 1. Register User Alpha
    alpha_in = schemas.UserRegister(
        username="user_alpha",
        email="alpha@domain.com",
        password="alphaPassword123",
        full_name="User Alpha",
        preferred_language="en",
        monthly_income=50000.0
    )
    alpha_auth = main.register(alpha_in, db=db)
    alpha_user = crud.get_user_by_id(db, alpha_auth.user.id)
    alpha_token = alpha_auth.token

    # 2. Register User Beta
    beta_in = schemas.UserRegister(
        username="user_beta",
        email="beta@domain.com",
        password="betaPassword456",
        full_name="User Beta",
        preferred_language="kn",
        monthly_income=30000.0
    )
    beta_auth = main.register(beta_in, db=db)
    beta_user = crud.get_user_by_id(db, beta_auth.user.id)
    beta_token = beta_auth.token

    # Ensure IDs and tokens are distinct
    assert alpha_user.id != beta_user.id
    assert alpha_token != beta_token

    # 3. User Alpha creates an expense & goal
    alpha_exp = crud.add_user_expense(
        db, alpha_user.id,
        schemas.ExpenseCreate(amount=12000.0, category="Rent", date="2026-11-01", notes="Alpha private rent")
    )
    alpha_goal = crud.add_user_goal(
        db, alpha_user.id,
        schemas.GoalCreate(name="Alpha Car", target_amount=200000.0, current_amount=50000.0)
    )

    # 4. User Beta creates an expense & goal
    beta_exp = crud.add_user_expense(
        db, beta_user.id,
        schemas.ExpenseCreate(amount=4500.0, category="Shopping", date="2026-11-02", notes="Beta clothes")
    )
    beta_goal = crud.add_user_goal(
        db, beta_user.id,
        schemas.GoalCreate(name="Beta Vacation", target_amount=80000.0, current_amount=15000.0)
    )

    # 5. Verify User Alpha cannot see User Beta's records
    alpha_expenses = crud.get_user_expenses(db, alpha_user.id)
    alpha_exp_ids = [e.id for e in alpha_expenses]
    assert alpha_exp.id in alpha_exp_ids
    assert beta_exp.id not in alpha_exp_ids
    assert all(e.user_id == alpha_user.id for e in alpha_expenses)

    alpha_goals = crud.get_user_goals(db, alpha_user.id)
    alpha_goal_names = [g.name for g in alpha_goals]
    assert "Alpha Car" in alpha_goal_names
    assert "Beta Vacation" not in alpha_goal_names

    # 6. Verify User Beta cannot see User Alpha's records
    beta_expenses = crud.get_user_expenses(db, beta_user.id)
    beta_exp_ids = [e.id for e in beta_expenses]
    assert beta_exp.id in beta_exp_ids
    assert alpha_exp.id not in beta_exp_ids
    assert all(e.user_id == beta_user.id for e in beta_expenses)

    beta_goals = crud.get_user_goals(db, beta_user.id)
    beta_goal_names = [g.name for g in beta_goals]
    assert "Beta Vacation" in beta_goal_names
    assert "Alpha Car" not in beta_goal_names

    # 7. Verify cross-user modification is blocked
    # User Beta tries to update Alpha's expense
    unauthorized_update = crud.update_user_expense(
        db, user_id=beta_user.id, expense_id=alpha_exp.id,
        update_data=schemas.ExpenseUpdate(amount=99999.0)
    )
    assert unauthorized_update is None, "User Beta was able to update User Alpha's expense!"

    # User Beta tries to delete Alpha's expense
    unauthorized_delete = crud.delete_user_expense(
        db, user_id=beta_user.id, expense_id=alpha_exp.id
    )
    assert unauthorized_delete is False, "User Beta was able to delete User Alpha's expense!"

    # User Beta tries to delete Alpha's goal
    unauthorized_goal_delete = crud.delete_user_goal(
        db, user_id=beta_user.id, goal_id=alpha_goal.id
    )
    assert unauthorized_goal_delete is False, "User Beta was able to delete User Alpha's goal!"

    # 8. Verify independent financial summaries
    alpha_summary = crud.calculate_financial_summary(db, alpha_user)
    beta_summary = crud.calculate_financial_summary(db, beta_user)

    assert alpha_summary.monthly_income == 50000.0
    assert alpha_summary.total_expenses == 12000.0
    assert alpha_summary.available_balance == 38000.0

    assert beta_summary.monthly_income == 30000.0
    assert beta_summary.total_expenses == 4500.0
    assert beta_summary.available_balance == 25500.0

    # 9. Verify Session Logout Revocation
    # When user Alpha logs out, their session is deleted and invalid
    main.logout(user=alpha_user, db=db)
    with pytest.raises(Exception):
        auth.get_current_user(f"Bearer {alpha_token}", db=db)

    # Beta's session remains fully valid
    still_valid_beta = auth.get_current_user(f"Bearer {beta_token}", db=db)
    assert still_valid_beta.id == beta_user.id

