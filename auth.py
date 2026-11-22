import sqlite3
import bcrypt
from pathlib import Path

DB_PATH = Path(__file__).with_name("moneyverse.db")


# Create users table
def create_users_table():

    with sqlite3.connect(DB_PATH) as conn:

        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        """)


# Register new user
def register_user(username, password):

    username = username.strip().lower()

    if not username:
        return False, "Enter a username."

    if len(password) < 8:
        return False, "Use at least 8 characters."

    if len(password.encode("utf-8")) > 72:
        return False, "Password is too long."

    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    try:

        with sqlite3.connect(DB_PATH) as conn:

            conn.execute("""
                INSERT INTO users (username, password)
                VALUES (?, ?)
            """, (username, hashed))

        return True, "Account created successfully!"

    except sqlite3.IntegrityError:

        return False, "Username already exists."


# Verify login
def login_user(username, password):

    username = username.strip().lower()

    if len(password.encode("utf-8")) > 72:
        return False

    with sqlite3.connect(DB_PATH) as conn:

        user = conn.execute("""
            SELECT password FROM users
            WHERE username = ?
        """, (username,)).fetchone()

    if user:

        return bcrypt.checkpw(
            password.encode("utf-8"),
            user[0].encode("utf-8")
        )

    return False


create_users_table()

if __name__ == "__main__":
    print("MONEYVERSE Authentication Ready!")