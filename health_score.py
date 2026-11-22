def calculate_health_score(income, expenses, goals):
    if income <= 0:
        return 0, "Add your income to calculate a score."

    total_expenses = sum(
        float(item.get("amount", 0))
        for item in expenses
    )

    balance = income - total_expenses
    savings_rate = max(0, balance / income)

    # Expense management: maximum 40 points
    expense_score = min(
        40, max(0, (1 - total_expenses / income) * 40)
    )

    # Savings potential: maximum 40 points
    savings_score = min(40, savings_rate * 100)

    # Goal planning: maximum 20 points
    goal_score = 20 if goals else 0

    score = round(
        expense_score + savings_score + goal_score
    )

    score = max(0, min(100, score))

    if score >= 75:
        message = "Good budgeting progress!"
    elif score >= 45:
        message = "You're making progress. Review your expenses."
    else:
        message = "Start by tracking expenses and setting a savings goal."

    return score, message


if __name__ == "__main__":
    score, message = calculate_health_score(
        20000,
        [{"amount": 5000}, {"amount": 3000}],
        [{"name": "Emergency Fund"}]
    )

    print("Financial Health Score:", score)
    print("Insight:", message)