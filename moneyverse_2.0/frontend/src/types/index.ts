export type LanguageCode = 'en' | 'kn' | 'hi' | 'ta' | 'te';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  preferred_language: LanguageCode;
  monthly_income: number;
}

export interface Income {
  id: number;
  user_id: number;
  amount: number;
  source: string;
  date: string;
  notes?: string;
}

export interface Expense {
  id: number;
  user_id: number;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
  notes?: string;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  target_date?: string;
  category: string;
  notes?: string;
  remaining_amount: number;
  progress_percentage: number;
  estimated_months_remaining?: number | null;
  is_completed: boolean;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinancialSummary {
  monthly_income: number;
  total_expenses: number;
  available_balance: number;
  income_spent_percentage: number;
  highest_expense_category: string | null;
  category_breakdown: CategoryExpense[];
  total_goals_target: number;
  total_goals_saved: number;
  goals_progress_percentage: number;
  active_goals_count: number;
  recent_transactions: Expense[];
}

export interface MirrorSimulationResponse {
  item_name: string;
  purchase_amount: number;
  current_balance: number;
  projected_balance: number;
  current_spent_percentage: number;
  projected_spent_percentage: number;
  can_afford: boolean;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  impact_on_goals: string;
  ai_verdict: string;
  ai_explanation: string;
  language: string;
}

export interface VoiceChatResponse {
  response_text: string;
  language: string;
  audio_base64?: string | null;
  ollama_model: string;
  success: boolean;
  error?: string | null;
}

export interface OllamaStatus {
  is_connected: boolean;
  model: string;
  available_models: string[];
  message: string;
}
