from auth import register_user,login_user
from gtts import gTTS
import streamlit as st
import pandas as pd
import plotly.express as px
from ollama import chat
import speech_recognition as sr
import io
from database import save_data, load_data
from health_score import calculate_health_score
from smart_insights import generate_insights


# -------------------------------
# MONEYVERSE - Main Configuration
# -------------------------------

st.set_page_config(
    page_title="MONEYVERSE",
    page_icon="💜",
    layout="wide"
)

# Dark theme styling
st.markdown("""
<style>
.stApp {
    background-color: #101426;
    color: white;
}
[data-testid="stSidebar"] {
    background-color: #191F38;
}
h1, h2, h3 {
    color: #B9A5FF !important;
}
.stMetric {
    background-color: #202945;
    padding: 15px;
    border-radius: 12px;
}
</style>
""", unsafe_allow_html=True)

# -------------------------------
# Session Data
# -------------------------------

# Load saved financial data
# Login and registration system

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:

    st.title("💜 MONEYVERSE")
    st.subheader("Your Money. Your Future. Your Language.")

    mode = st.radio(
        "Choose an option",
        ["Login", "Register"],
        horizontal=True
    )

    username = st.text_input("Username")
    password = st.text_input(
        "Password",
        type="password"
    )

    if mode == "Register":

        confirm = st.text_input(
            "Confirm Password",
            type="password"
        )

        if st.button("Create Account"):

            if password != confirm:
                st.error("Passwords do not match.")

            else:
                success, message = register_user(
                    username, password
                )

                if success:
                    st.success(message)
                    st.info("Select Login to continue.")
                else:
                    st.error(message)

    else:

        if st.button("Login"):

            if login_user(username, password):

                st.session_state.username = (
                    username.strip().lower()
                )

                st.session_state.logged_in = True

                st.rerun()

            else:
                st.error("Invalid username or password.")

    st.stop()


# Load individual financial profile

if "database_loaded" not in st.session_state:

    income, expenses, goals = load_data(
        st.session_state.username
    )

    st.session_state.income = income
    st.session_state.expenses = expenses
    st.session_state.goals = goals

    st.session_state.database_loaded = True
# -------------------------------
# Language Settings
# -------------------------------

languages = {
    "English": "en",
    "ಕನ್ನಡ": "kn",
    "हिन्दी": "hi",
    "தமிழ்": "ta",
    "తెలుగు": "te"
}

# -------------------------------
# Sidebar
# -------------------------------

st.sidebar.title("💜 MONEYVERSE")
st.sidebar.caption("Your Money. Your Future. Your Language.")

language = st.sidebar.selectbox(
    "Choose your language",
    list(languages.keys())
)

page = st.sidebar.radio(
    "Navigation",
    [
        "Home Dashboard",
        "Money Mirror",
        "Money Voice",
        "Goal Bridge",
        "Expense Manager",
        "Reports"
    ]
)

st.sidebar.divider()
st.sidebar.caption("AI-powered financial companion")

# -------------------------------
# Prepare Financial Data
# -------------------------------

df = pd.DataFrame(
    st.session_state.expenses,
    columns=["Description", "Category", "Amount"]
)

total_expenses = (
    df["Amount"].sum() if not df.empty else 0
)

available_balance = (
    st.session_state.income - total_expenses
)

# -------------------------------
# HOME DASHBOARD
# -------------------------------

if page == "Home Dashboard":

    st.title("💜 Welcome to MONEYVERSE")

    st.subheader(
        "Understand. Plan. Decide. Achieve."
    )

    st.write(
        "Your intelligent financial future starts here."
    )

    col1, col2, col3 = st.columns(3)

    col1.metric(
        "Monthly Income",
        f"₹{st.session_state.income:,.2f}"
    )

    col2.metric(
        "Total Expenses",
        f"₹{total_expenses:,.2f}"
    )

    col3.metric(
        "Available Balance",
        f"₹{available_balance:,.2f}"
    )

    st.divider()

    st.subheader("Explore Your Financial Future")

    c1, c2, c3 = st.columns(3)

    with c1:
        st.markdown("### 🔮 Money Mirror")
        st.write("Simulate financial decisions.")

    with c2:
        st.markdown("### 🎤 Money Voice")
        st.write("Ask questions in your language.")

    with c3:
        st.markdown("### 🎯 Goal Bridge")
        st.write("Turn dreams into financial goals.")

    st.info(
        "Start by entering your income and expenses "
        "in Expense Manager."
    )

    # Financial Health Score
    st.divider()
    st.subheader("💜 Your Financial Health Score")

    score, insight = calculate_health_score(
        st.session_state.income,
        st.session_state.expenses,
        st.session_state.goals
    )

    st.metric("Budgeting Score", f"{score}/100")

    st.progress(score / 100)

    st.info(insight)

    # Smart Financial Insights
    st.divider()
    st.subheader("🧠 Smart Financial Insights")

    insights = generate_insights(
        st.session_state.income,
        st.session_state.expenses,
        st.session_state.goals
    )

    
    col1, col2 = st.columns(2)

    with col1:
        st.metric(
            "Income Spent",
            f"{insights['spending_percent']}%"
        )

    with col2:
        st.metric(
            "Top Expense Category",
            insights["top_category"]
        )

    st.subheader("🚨 Spending Alerts")

    for alert in insights["alerts"]:
        st.info(alert)

    st.subheader("💡 Savings Suggestions")

    for tip in insights["tips"]:
        st.write("•", tip)

    # Multilingual AI Financial Insights
    st.divider()
    st.subheader("🤖 AI Financial Advisor")

    if st.button("✨ Generate AI Insights"):

        selected_language = {
            "English": "English",
            "ಕನ್ನಡ": "Kannada",
            "हिन्दी": "Hindi",
            "தமிழ்": "Tamil",
            "తెలుగు": "Telugu"
        }.get(language, "English")

        expense_details = "\n".join(
            f"{item.get('Category', item.get('category', 'Other'))}: "
            f"₹{float(item.get('Amount', item.get('amount', 0))):,.2f}"
            for item in st.session_state.expenses
        )

        if not expense_details:
            expense_details = "No expenses recorded."

        prompt = f"""
You are MONEYVERSE, a friendly Indian budgeting assistant.

IMPORTANT LANGUAGE RULES:
- Reply ONLY in {selected_language}.
- If Kannada is selected, use simple, natural,
  everyday spoken Kannada.
- Use short sentences like a friendly teacher.
- Avoid difficult, formal, or literary words.
- Never repeat the same advice.
- Do not invent financial information.

User information:
Monthly income: ₹{st.session_state.income}
Expenses:
{expense_details}
Income spent: {insights['spending_percent']}%
Highest expense category: {insights['top_category']}

Explain these details in exactly 3 short points:
1. How much money the user spent.
2. One realistic way to reduce expenses.
3. One simple savings suggestion.

For Kannada, use this writing style:
"ನಿಮ್ಮ ತಿಂಗಳ ಆದಾಯ ₹20,000.
ನೀವು ₹8,000 ಖರ್ಚು ಮಾಡಿದ್ದೀರಿ.
ಇನ್ನೂ ₹12,000 ಉಳಿದಿದೆ.
ಪ್ರತಿ ತಿಂಗಳು ಸ್ವಲ್ಪ ಹಣ ಉಳಿಸಲು ಪ್ರಯತ್ನಿಸಿ."

Keep the entire response under 70 words.
Do not recommend investments or financial products.
"""

# -------------------------------
# MONEY MIRROR
# -------------------------------

elif page == "Money Mirror":

    st.title("🔮 MONEY MIRROR")

    st.subheader(
        "See the possible impact before spending."
    )

    st.write(
        "Imagine a purchase and understand "
        "how it could affect your available money."
    )

    purchase = st.number_input(
        "How much do you want to spend?",
        min_value=0.0,
        step=100.0
    )

    reason = st.text_input(
        "What do you want to purchase?"
    )

    if st.button("Simulate My Future"):

        remaining = available_balance - purchase

        st.divider()

        st.subheader("Your Simulation")

        st.metric(
            "Current Available Balance",
            f"₹{available_balance:,.2f}"
        )

        st.metric(
            "After This Purchase",
            f"₹{remaining:,.2f}"
        )

        if purchase == 0:
            st.info("Enter a purchase amount.")

        elif remaining < 0:
            st.warning(
                "This purchase is higher than "
                "your currently available balance."
            )

        else:
            st.success(
                f"You would have ₹{remaining:,.2f} remaining."
            )

            # Financial Impact Analysis
        if purchase > 0 and available_balance > 0:

            impact = (purchase / available_balance) * 100

            st.subheader("Financial Impact Analysis")

            st.write(
                f"This purchase uses {impact:.1f}% "
                "of your available balance."
            )

            if impact <= 20:
                st.success(
                    "Low impact on your available balance."
                )

            elif impact <= 50:
                st.warning(
                    "Moderate impact. Review your upcoming expenses."
                )

            else:
                st.error(
                    "High impact. This purchase would use "
                    "more than half of your available balance."
                )

        if reason:
            st.write("Purchase:", reason)

        # Money Mirror + Goal Bridge Connection
        if st.session_state.goals:

            st.subheader("🎯 Impact on Your Savings Goal")

            goal_names = [
                goal["Name"]
                for goal in st.session_state.goals
            ]

            selected_name = st.selectbox(
                "Choose your financial goal",
                goal_names
            )

            goal = next(
                g for g in st.session_state.goals
                if g["Name"] == selected_name
            )

            target = goal["Target"]
            saved = goal["Saved"]
            monthly = goal["Monthly Saving"]

            remaining_goal = max(target - saved, 0)

            if monthly > 0:

                original_months = remaining_goal / monthly

                # Assume purchase is paid from goal savings
                new_saved = max(saved - purchase, 0)

                new_remaining = max(target - new_saved, 0)

                new_months = new_remaining / monthly

                delay = new_months - original_months

                st.write(
                    f"Goal: {selected_name}"
                )

                st.metric(
                    "Original Time",
                    f"{original_months:.1f} months"
                )

                st.metric(
                    "Time After Purchase",
                    f"{new_months:.1f} months"
                )

                st.metric(
                    "Estimated Delay",
                    f"{delay:.1f} months"
                )

                if delay > 0:
                    st.warning(
                        "This purchase could delay "
                        "your financial goal."
                    )

            else:
                st.info(
                    "Set a monthly savings amount "
                    "to calculate the timeline."
                )

    st.caption(
        "This is a basic mathematical simulation, "
        "not a prediction or financial recommendation."
    )

# -------------------------------
# MONEY VOICE
# -------------------------------

elif page == "Money Voice":

    st.title("🎤 MONEY VOICE")
    st.subheader("Your AI Financial Assistant")
    if st.button("✨ Generate AI Insights", key="dashboard_ai"):
        st.session_state["dashboard_ai_requested"] = True

    if st.session_state.get("dashboard_ai_requested", False):
        with st.spinner("MONEYVERSE AI is analyzing your finances..."):
            try:
                import ollama

                # Get financial information
                income = float(st.session_state.get("income", 0))
                expenses = st.session_state.get("expenses", [])

                total_expenses = sum(
                    float(item.get("Amount", 0))
                    for item in expenses
                )

                balance = income - total_expenses

                # Get selected language
                selected_language = st.session_state.get(
                    "language", "English"
                )

                prompt = f"""
You are MONEYVERSE, a personal finance education assistant.

Monthly income: ₹{income:,.2f}
Total expenses: ₹{total_expenses:,.2f}
Available balance: ₹{balance:,.2f}

Give exactly 3 short, useful budgeting suggestions.

Respond in simple {selected_language}.
For Kannada, use easy everyday Kannada.
Do not invent financial information.
"""

                # Generate real AI response
                response = ollama.chat(
                    model="qwen2.5:3b",
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )

                # Save response so it stays visible
                st.session_state["dashboard_ai_response"] = (
                    response["message"]["content"]
                )

                st.session_state["dashboard_ai_requested"] = False

            except Exception as e:
                st.session_state["dashboard_ai_requested"] = False
                st.error(f"AI Error: {e}")

    if st.session_state.get("dashboard_ai_response"):
        st.success("AI insights generated successfully!")
        st.write(st.session_state["dashboard_ai_response"])
    st.write(
        "Ask a question about your money, "
        "expenses, or savings goals."
    )

    input_method = st.radio(
        "Choose your input method",
        ["Text", "Voice"],
        horizontal=True
    )

    question = ""

    if input_method == "Text":

        question = st.text_area(
            "Ask MONEYVERSE AI",
            placeholder="Type your question here"
        )

    else:

        audio = st.audio_input(
            "🎤 Record your question"
        )

        speech_languages = {
            "English": "en-IN",
            "ಕನ್ನಡ": "kn-IN",
            "हिन्दी": "hi-IN",
            "தமிழ்": "ta-IN",
            "తెలుగు": "te-IN"
        }

        if audio is not None:

            recognizer = sr.Recognizer()

            try:
                with sr.AudioFile(
                    io.BytesIO(audio.getvalue())
                ) as source:

                    audio_data = recognizer.record(source)

                question = recognizer.recognize_google(
                    audio_data,
                    language=speech_languages.get(
                        language, "en-IN"
                    )
                )

                st.success("Voice recognized!")

                question = st.text_area(
                    "Recognized question",
                    value=question
                )

            except sr.UnknownValueError:
                st.warning(
                    "Could not understand your voice. "
                    "Please try again."
                )

            except sr.RequestError:
                st.error(
                    "Check your internet connection."
                )

    if st.button("🤖 Ask AI"):

        if not question.strip():
            st.warning("Please enter a question.")

        else:
            language_names = {
                "English": "English",
                "ಕನ್ನಡ": "Kannada",
                "हिन्दी": "Hindi",
                "தமிழ்": "Tamil",
                "తెలుగు": "Telugu"
            }

            selected_language = language_names.get(
                language, "English"
            )

            # Give AI the user's current financial data
            financial_data = (
                f"Monthly income: ₹{st.session_state.income}\n"
                f"Total recorded expenses: ₹{total_expenses}\n"
                f"Available balance: ₹{available_balance}\n"
                f"Savings goals: {st.session_state.goals}"
            )

            instructions = f"""
You are MONEYVERSE AI, a friendly financial
education assistant.

Use simple everyday spoken language.

If the selected language is Kannada:
- Use natural conversational Kannada.
- Use common words understood by everyone.
- Avoid complicated Kannada vocabulary.
- Do not translate English word by word.
- Avoid repeating sentences.
- Give short and meaningful answers.
- Use simple examples with rupees.

Example Kannada answer:
ಹಣ ಉಳಿಸಲು ಮೊದಲು ನಿಮ್ಮ ಖರ್ಚಿನ ಲೆಕ್ಕ ಇಡಿ.
ಅನಗತ್ಯ ಖರ್ಚುಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಿ.
ಪ್ರತಿ ತಿಂಗಳು ಸ್ವಲ್ಪ ಹಣವನ್ನು ಉಳಿತಾಯ ಮಾಡಿ.
"""

            with st.spinner("MONEYVERSE AI is thinking..."):

                try:
                    response = chat(
                        model="qwen2.5:3b",
                        options={"temperature": 0.2},
                        messages=[
                            {
                                "role": "system",
                                "content": instructions
                            },
                            {
                                "role": "user",
                                "content": question
                            }
                        ]
                    )

                    answer = response.message.content

                    st.subheader("🤖 MONEYVERSE AI")
                    st.write(answer)
                    # AI Voice Output
                    voice_languages = {
                        "English": "en",
                        "ಕನ್ನಡ": "kn",
                        "हिन्दी": "hi",
                        "தமிழ்": "ta",
                        "తెలుగు": "te"
                    }

                    try:
                        voice = gTTS(
                            text=answer,
                            lang=voice_languages.get(
                                language, "en"
                            ),
                            slow=False
                        )

                        audio_buffer = io.BytesIO()

                        voice.write_to_fp(audio_buffer)

                        audio_buffer.seek(0)

                        st.subheader("🔊 Listen to AI Answer")

                        st.audio(
                            audio_buffer,
                            format="audio/mp3"
                        )

                    except Exception as e:
                        st.warning(
                            f"Voice output unavailable: {e}"
                        )

                except Exception:
                    st.error(
                        "Cannot connect to local AI. "
                        "Make sure Ollama is running "
                        "and qwen2.5:3b is downloaded."
                    )

    st.caption(
        "AI responses are educational and may "
        "contain mistakes. No real bank account "
        "is connected."
    )



    


# -------------------------------
# GOAL BRIDGE
# -------------------------------

elif page == "Goal Bridge":

    st.title("🎯 GOAL BRIDGE")

    st.subheader(
        "Turn your dreams into financial plans."
    )

    with st.form("goal_form"):

        goal_name = st.text_input(
            "What is your dream?"
        )

        target = st.number_input(
            "Target amount (₹)",
            min_value=1.0,
            step=1000.0
        )

        saved = st.number_input(
            "Already saved (₹)",
            min_value=0.0,
            step=500.0
        )

        monthly = st.number_input(
            "How much can you save monthly? (₹)",
            min_value=0.0,
            step=500.0
        )

        submit_goal = st.form_submit_button(
            "Create My Goal"
        )

    if submit_goal:

        if not goal_name.strip():
            st.error("Enter a goal name.")

        elif saved > target:
            st.error(
                "Your saved amount cannot exceed "
                "your target in this starter version."
            )

        else:
            st.session_state.goals.append({
                "Name": goal_name,
                "Target": target,
                "Saved": saved,
                "Monthly Saving": monthly
            })

            st.success("Your goal has been created!")

    st.divider()

    st.subheader("My Financial Goals")

    for goal in st.session_state.goals:

        st.markdown(f"### {goal['Name']}")

        st.write(
            f"Target: ₹{goal['Target']:,.2f}"
        )

        st.write(
            f"Saved: ₹{goal['Saved']:,.2f}"
        )

        progress = goal["Saved"] / goal["Target"]

        st.progress(progress)

        st.write(
            f"Progress: {progress * 100:.1f}%"
        )

        remaining = goal["Target"] - goal["Saved"]

        if goal["Monthly Saving"] > 0:
            months = remaining / goal["Monthly Saving"]

            st.write(
                f"Estimated time remaining: {months:.1f} months"
            )

        else:
            st.write(
                "Enter a monthly savings amount "
                "to estimate your timeline."
            )

# -------------------------------
# EXPENSE MANAGER
# -------------------------------

elif page == "Expense Manager":

    st.title("💰 EXPENSE MANAGER")

    st.subheader("Manage Your Money")

    st.session_state.income = st.number_input(
        "Enter your monthly income (₹)",
        min_value=0.0,
        value=float(st.session_state.income),
        step=500.0
    )

    st.divider()

    st.subheader("Add New Expense")

    with st.form("expense_form"):

        description = st.text_input(
            "Expense description"
        )

        category = st.selectbox(
            "Category",
            [
                "Food",
                "Travel",
                "Education",
                "Shopping",
                "Entertainment",
                "Other"
            ]
        )

        amount = st.number_input(
            "Amount (₹)",
            min_value=0.0,
            step=50.0
        )

        add = st.form_submit_button(
            "Add Expense"
        )

    if add:

        if amount > 0:

            st.session_state.expenses.append({
                "Description": description or category,
                "Category": category,
                "Amount": amount
            })

            st.success("Expense added successfully!")

        else:
            st.warning("Enter an amount greater than zero.")

    st.divider()

    st.subheader("Your Expense History")

    if not df.empty:

        st.dataframe(
            df,
            use_container_width=True
        )

        if st.button("Delete All Expenses"):
            st.session_state.expenses = []
            st.rerun()

    else:
        st.info("No expenses recorded yet.")

# -------------------------------
# REPORTS
# -------------------------------

elif page == "Reports":

    st.title("📊 FINANCIAL REPORTS")

    st.subheader("Your Spending Analysis")

    if not df.empty:

        category_data = (
            df.groupby("Category")["Amount"]
            .sum()
            .reset_index()
        )

        fig = px.pie(
            category_data,
            names="Category",
            values="Amount",
            hole=0.5,
            title="Expenses by Category",
            template="plotly_dark"
        )

        st.plotly_chart(
            fig,
            use_container_width=True
        )

        st.subheader("Expense Details")

        st.dataframe(category_data)

        csv = df.to_csv(index=False).encode("utf-8")

        st.download_button(
            "Download Expense Report",
            data=csv,
            file_name="moneyverse_report.csv",
            mime="text/csv"
        )

    else:
        st.info(
            "Add expenses first to view your reports."
        )

    st.caption(
        "MONEYVERSE is a planning and educational "
        "prototype, not a banking application."
    )

# -------------------------------
# Footer
# -------------------------------

st.divider()

st.caption(
    "MONEYVERSE | Your Money. Your Future. Your Language."
)
# Automatically save financial information
save_data(
    st.session_state.username,
    st.session_state.income,
    st.session_state.expenses,
    st.session_state.goals
)
# Logout button
st.sidebar.write(
    f"👤 {st.session_state.username}"
)

if st.sidebar.button("🚪 Logout"):
    st.session_state.clear()
    st.rerun()