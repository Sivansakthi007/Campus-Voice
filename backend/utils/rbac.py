# backend/utils/rbac.py

from functools import wraps
from fastapi import Request
from fastapi.responses import JSONResponse

def require_roles(*roles):
    """
    Decorator to restrict access to users with specified roles.
    Usage: @require_roles('student', 'admin')
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(request, 'user', None)
            if not user or user.role not in roles:
                return JSONResponse(content={'error': 'Forbidden'}, status_code=403)
            return f(*args, **kwargs)
        return wrapper
    return decorator

# Allowed status transitions for complaints
VALID_TRANSITIONS = {
    'Pending': ['Accepted', 'Rejected'],
    'Accepted': ['In-Process'],
    'In-Process': ['Completed'],
}

def is_valid_transition(current, new):
    """
    Returns True if the status transition is allowed, else False.
    """
    return new in VALID_TRANSITIONS.get(current, [])
