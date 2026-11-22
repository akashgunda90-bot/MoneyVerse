import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_db, User, UserSession

SESSION_DURATION_DAYS = 7

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a random salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()
    return f"{salt}${pw_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against salt$hash string using constant-time comparison."""
    if not hashed_password or "$" not in hashed_password:
        return False
    salt, original_hash = hashed_password.split("$", 1)
    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()
    return hmac.compare_digest(original_hash, computed_hash)

def create_user_session(db: Session, user_id: int) -> str:
    """Create a new secure session token stored in SQLite."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS)
    
    session_record = UserSession(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(session_record)
    db.commit()
    return token

def revoke_session(db: Session, token: str):
    """Revoke/delete an active session."""
    db.query(UserSession).filter(UserSession.token == token).delete()
    db.commit()

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI dependency to extract and authenticate current active user from Bearer token."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Must be Bearer <token>"
        )
    
    token = parts[1]
    session_record = db.query(UserSession).filter(UserSession.token == token).first()
    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    if session_record.expires_at < datetime.utcnow():
        db.delete(session_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )
    
    user = db.query(User).filter(User.id == session_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user
