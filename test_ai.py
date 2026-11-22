import streamlit as st
import ollama

st.title("💜 MONEYVERSE AI TEST")

if st.button("✨ Generate AI Insights"):
    st.success("Button is working!")

    try:
        with st.spinner("AI is thinking..."):
            response = ollama.chat(
                model="qwen2.5:3b",
                messages=[
                    {
                        "role": "user",
                        "content": "Give me 3 simple tips to save money."
                    }
                ],
                options={"num_predict": 150},
            )

        st.success("AI response generated!")
        st.write(response["message"]["content"])

    except Exception as e:
        st.error(f"AI Error: {e}")