from collections import defaultdict


def generate_insights(income, expenses, goals):
    income = float(income)
    total_expenses = 0
    categories = defaultdict(float)

    for item in expenses:
        amount = float(
            item.get("Amount", item.get("amount", 0))
        )

        category = item.get(
            "Category", item.get("category", "Other")
        )

        total_expenses += amount
        categories[category] += amount

    balance = income - total_expenses

    if income <= 0:
        return {
            "spending_percent": 0,
            "top_category": "None",
            "alerts": ["Add your monthly income first."],
            "tips": ["Start recording your income and expenses."]
        }

    spending_percent = (total_expenses / income) * 100

    top_category = (
        max(categories, key=categories.get)
        if categories else "None"
    )

    alerts = []
    tips = []

    if spending_percent > 100:
        alerts.append(
            "Your recorded expenses exceed your income."
        )
    elif spending_percent >= 80:
        alerts.append(
            "Your expenses use at least 80% of your income."
        )
    else:
        alerts.append(
            "Your recorded expenses are within your income."
        )

    if top_category != "None":
        tips.append(
            f"Your highest spending category is {top_category}."
        )
        tips.append(
            f"Review your {top_category} expenses "
            "for possible savings."
        )

    if balance > 0:
        tips.append(
            f"You have ₹{balance:,.2f} remaining "
            "based on recorded expenses."
        )

    if not goals:
        tips.append(
            "Consider creating a savings goal in Goal Bridge."
        )
    else:
        tips.append(
            "Review your Goal Bridge progress regularly."
        )

    return {
        "spending_percent": round(spending_percent, 1),
        "top_category": top_category,
        "alerts": alerts,
        "tips": tips
    }


if __name__ == "__main__":
    result = generate_insights(
        20000,
        [
            {"category": "Food", "amount": 5000},
            {"category": "Travel", "amount": 3000}
        ],
        [{"name": "Laptop"}]
    )

    print(result)