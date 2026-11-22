from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = ""
    preferred_language: Optional[str] = "en"
    monthly_income: Optional[float] = 0.0

class UserLogin(BaseModel):
    login_id: str  # Can be username or email
    password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None
    monthly_income: Optional[float] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    full_name: Optional[str] = ""
    preferred_language: str = "en"
    monthly_income: float = 0.0

class AuthResponse(BaseModel):
    token: str
    user: UserOut
    message: str

# Income
class IncomeCreate(BaseModel):
    amount: float = Field(..., gt=0)
    source: str
    date: str  # YYYY-MM-DD
    notes: Optional[str] = ""

class IncomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    amount: float
    source: str
    date: str
    notes: Optional[str] = ""

# Expense
class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0)
    category: str
    date: str  # YYYY-MM-DD
    payment_method: Optional[str] = "UPI"
    notes: Optional[str] = ""

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    date: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    amount: float
    category: str
    date: str
    payment_method: str
    notes: Optional[str] = ""

# Goal
class GoalCreate(BaseModel):
    name: str
    target_amount: float = Field(..., gt=0)
    current_amount: Optional[float] = 0.0
    monthly_contribution: Optional[float] = 0.0
    target_date: Optional[str] = ""
    category: Optional[str] = "Savings"
    notes: Optional[str] = ""

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = None
    monthly_contribution: Optional[float] = None
    target_date: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    name: str
    target_amount: float
    current_amount: float
    monthly_contribution: float
    target_date: Optional[str] = ""
    category: str
    notes: Optional[str] = ""
    # Computed metrics
    remaining_amount: float = 0.0
    progress_percentage: float = 0.0
    estimated_months_remaining: Optional[float] = None
    is_completed: bool = False

# Summary & Financial Calculations
class CategoryExpense(BaseModel):
    category: str
    amount: float
    percentage: float

class FinancialSummary(BaseModel):
    monthly_income: float
    total_expenses: float
    available_balance: float
    income_spent_percentage: float
    highest_expense_category: Optional[str] = None
    category_breakdown: List[CategoryExpense] = []
    total_goals_target: float = 0.0
    total_goals_saved: float = 0.0
    goals_progress_percentage: float = 0.0
    active_goals_count: int = 0
    recent_transactions: List[ExpenseOut] = []

# Money Mirror Simulation
class MirrorSimulationRequest(BaseModel):
    item_name: str
    purchase_amount: float = Field(..., gt=0)
    category: Optional[str] = "Shopping"
    planned_month: Optional[str] = None

class MirrorSimulationResponse(BaseModel):
    item_name: str
    purchase_amount: float
    current_balance: float
    projected_balance: float
    current_spent_percentage: float
    projected_spent_percentage: float
    can_afford: bool
    risk_level: str  # "Low", "Moderate", "High", "Critical"
    impact_on_goals: str
    ai_verdict: str
    ai_explanation: str
    language: str

# Money Voice & AI Q&A
class VoiceChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    include_audio: Optional[bool] = False

class VoiceChatResponse(BaseModel):
    response_text: str
    language: str
    audio_base64: Optional[str] = None
    ollama_model: str
    success: bool
    error: Optional[str] = None

class OllamaStatus(BaseModel):
    is_connected: bool
    model: str
    available_models: List[str] = []
    message: str
