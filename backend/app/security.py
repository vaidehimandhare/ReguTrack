from pwdlib import PasswordHash
from jose import jwt


password_hash = PasswordHash.recommended()

SECRET_KEY = "regutrack-secret-key"
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password
    )


def create_access_token(user_id: int) -> str:
    payload = {
        "user_id": user_id
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )