from fastapi import APIRouter, HTTPException

from app.database import SessionLocal
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.security import (
    hash_password,
    verify_password,
    create_access_token
)


router = APIRouter()


@router.post("/register")
def register_user(user_data: RegisterRequest):

    db = SessionLocal()

    try:
        existing_user = db.query(User).filter(
            User.email == user_data.email
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        hashed_password = hash_password(
            user_data.password
        )

        new_user = User(
            name=user_data.name,
            email=user_data.email,
            password_hash=hashed_password
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": "User registered successfully",
            "user_id": new_user.id,
            "name": new_user.name,
            "email": new_user.email
        }

    finally:
        db.close()


@router.post("/login")
def login_user(user_data: LoginRequest):

    db = SessionLocal()

    try:
        user = db.query(User).filter(
            User.email == user_data.email
        ).first()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        password_valid = verify_password(
            user_data.password,
            user.password_hash
        )

        if not password_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        access_token = create_access_token(user.id)

        return {
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "name": user.name,
            "email": user.email
        }

    finally:
        db.close()