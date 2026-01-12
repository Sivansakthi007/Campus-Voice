# utils/auth.py
from fastapi import Depends, HTTPException, status, Request

def get_current_user(request: Request):
    # Example: Extract user info from request/session/JWT
    user = request.state.user  # Adjust as per your auth setup
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user