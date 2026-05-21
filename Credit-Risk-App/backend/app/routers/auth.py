from fastapi import APIRouter, HTTPException, status

from app.database import get_users_collection
from app.schemas import TokenResponse, UserLogin, UserRegister, UserResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister):
    username = payload.username.lower().strip()
    users = get_users_collection()

    if users.find_one({"username": username}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    if users.find_one({"email": payload.email.lower()}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    users.insert_one(
        {
            "username": username,
            "email": payload.email.lower(),
            "password": hash_password(payload.password),
        }
    )
    return UserResponse(username=username, email=payload.email.lower())


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin):
    username = payload.username.lower().strip()
    user = get_users_collection().find_one({"username": username})

    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return TokenResponse(access_token=create_access_token(username))
