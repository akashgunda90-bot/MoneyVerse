import os
import json
import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_db, User, UserSession

SECRET_KEY = os.getenv("SECRET_KEY", "moneyverse-production-jwt-secret-key-salt-987654321")
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
    """Create a new secure cryptographically signed session token, also recorded in database."""
    expires_at = datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS)
    exp_ts = int(expires_at.timestamp())
    nonce = secrets.token_hex(8)

    # 1. Build signed payload
    payload_dict = {
        "uid": user_id,
        "exp": exp_ts,
        "nonce": nonce
    }
    raw_payload = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw_payload).decode("utf-8").rstrip("=")

    # 2. Compute HMAC signature
    sig = hmac.new(
        SECRET_KEY.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    token = f"{b64_payload}.{sig}"

    # 3. Store session record in DB (for tracking, session auditing, and revocation on logout)
    try:
        session_record = UserSession(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.add(session_record)
        db.commit()
    except Exception:
        db.rollback()

    return token

def revoke_session(db: Session, token: str):
    """Revoke/delete an active session from database."""
    try:
        db.query(UserSession).filter(UserSession.token == token).delete()
        db.commit()
    except Exception:
        db.rollback()

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

    # 1. If signed token, verify signature & expiry first
    if "." in token:
        token_parts = token.split(".")
        if len(token_parts) == 2:
            b64_payload, signature = token_parts
            expected_sig = hmac.new(
                SECRET_KEY.encode("utf-8"),
                b64_payload.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(signature, expected_sig):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid session token signature."
                )
            try:
                padded_b64 = b64_payload + "=" * (-len(b64_payload) % 4)
                payload_json = json.loads(base64.urlsafe_b64decode(padded_b64).decode("utf-8"))
                exp_ts = payload_json.get("exp", 0)
                if datetime.utcnow().timestamp() > exp_ts:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Session has expired. Please log in again."
                    )
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Malformed session token."
                )

    # 2. Check DB session record (enforces revocation upon logout)
    session_record = db.query(UserSession).filter(UserSession.token == token).first()
    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again."
        )

    if session_record.expires_at < datetime.utcnow():
        try:
            db.delete(session_record)
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )

    user = db.query(User).filter(User.id == session_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please log in again."
        )

    return user
