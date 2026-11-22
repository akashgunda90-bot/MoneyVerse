import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).with_name("moneyverse.db")


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_finances (
                username TEXT PRIMARY KEY,
                income REAL DEFAULT 0,
                expenses TEXT DEFAULT '[]',
                goals TEXT DEFAULT '[]'
            )
        """)


def save_data(username, income, expenses, goals):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO user_finances
            (username, income, expenses, goals)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                income = excluded.income,
                expenses = excluded.expenses,
                goals = excluded.goals
        """, (
            username,
            income,
            json.dumps(expenses, ensure_ascii=False),
            json.dumps(goals, ensure_ascii=False)
        ))


def load_data(username):
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("""
            SELECT income, expenses, goals
            FROM user_finances
            WHERE username = ?
        """, (username,)).fetchone()

    if row:
        return row[0], json.loads(row[1]), json.loads(row[2])

    return 0, [], []


init_db()