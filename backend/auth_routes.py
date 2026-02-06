from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import timedelta
import uuid

from database import get_db
from models import User
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Pydantic models for request/response
class UserSignup(BaseModel):
    """Model for user signup request"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "recruiter"  

class UserResponse(BaseModel):
    """Model for user response"""
    user_id: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool

class Token(BaseModel):
    """Model for token response"""
    access_token: str
    token_type: str
    user: UserResponse

@router.post("/signup", response_model=Token)
def signup(user_data: UserSignup, db = Depends(get_db)):
    """
    Register a new user
    
    Steps:
    1. Check if email already exists
    2. Hash the password
    3. Create new user in database
    4. Generate access token
    5. Return token and user info
    """
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_id = f"USR{uuid.uuid4().hex[:12].upper()}"
    hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        user_id=user_id,
        email=user_data.email,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email},
        expires_delta=access_token_expires
    )
    
    # Return token and user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            user_id=new_user.user_id,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            role=new_user.role,
            is_active=new_user.is_active
        )
    }

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db = Depends(get_db)
):
    """
    Login user and return access token
    
    Steps:
    1. Find user by email
    2. Verify password
    3. Generate access token
    4. Return token and user info
    """
    
    # Find user
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    # Return token and user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            user_id=user.user_id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active
        )
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    token: str = Depends(lambda: None),
    db = Depends(get_db)
):
    """
    Get current user information from token
    This endpoint is used to verify if a token is still valid
    """
    from auth import get_current_user
    
    user = get_current_user(token=token, db=db)
    
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active
    )