import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from fastapi import HTTPException

# Ensure local .env is loaded so importing this module (server, Alembic, etc.)
# sees the expected MYSQL_ / SQLALCHEMY_* variables.
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).resolve().parents[0] / '.env')

logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.environ.get("SQLALCHEMY_DATABASE_URL") or os.environ.get("DATABASE_URL")
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("mysql://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("mysql://", "mysql+asyncmy://", 1)

# If an explicit DB URL is not provided, try building one from MYSQL_* env vars
# Note: URL-encode the password in case it contains special characters.
from urllib.parse import quote_plus

if not SQLALCHEMY_DATABASE_URL:
    mysql_user = os.environ.get("MYSQL_USER")
    if mysql_user:
        mysql_password = quote_plus(os.environ.get("MYSQL_PASSWORD", "Sakthi2005"))
        mysql_host = os.environ.get("MYSQL_HOST", "localhost")
        mysql_port = os.environ.get("MYSQL_PORT", "3306")
        mysql_db = os.environ.get("MYSQL_DB", "campus_voice_db")
        # Using asyncmy for async MySQL connections
        SQLALCHEMY_DATABASE_URL = f"mysql+asyncmy://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}"
    else:
        # Fallback to a local MySQL DB for development/testing if no URL provided
        SQLALCHEMY_DATABASE_URL = "mysql+asyncmy://root:Sakthi2005@localhost/campus_voice_db"


def _mask_url(url: str) -> str:
    """Mask password in database URL for safe logging."""
    try:
        # Pattern: scheme://user:password@host...
        if "://" in url and "@" in url:
            prefix, rest = url.split("://", 1)
            if ":" in rest.split("@")[0]:
                user, after_user = rest.split(":", 1)
                password, host_part = after_user.split("@", 1)
                return f"{prefix}://{user}:****@{host_part}"
        return url
    except Exception:
        return "<URL parsing failed>"


# Log the resolved URL (masked) at import time so it's visible in startup logs
logger.info(f"Database URL resolved to: {_mask_url(SQLALCHEMY_DATABASE_URL or '')}")


# Example MySQL URL: "mysql+asyncmy://user:pass@localhost:3306/dbname"
# Create the async engine lazily. When Alembic imports this module for autogeneration
# it does not need the async DB driver, so avoid raising at import time.
Base = declarative_base()
engine = None
AsyncSessionLocal = None

def init_engine():
    """Initialize the async engine and session factory.
    This is safe to call multiple times; it will be a no-op if already initialized.
    """
    global engine, AsyncSessionLocal
    if engine is not None and AsyncSessionLocal is not None:
        return engine
    if not SQLALCHEMY_DATABASE_URL:
        raise RuntimeError("SQLALCHEMY_DATABASE_URL is not configured")
    try:
        logger.info(f"Creating database engine with connection pooling: {_mask_url(SQLALCHEMY_DATABASE_URL)}")
        engine = create_async_engine(
            SQLALCHEMY_DATABASE_URL,
            future=True,
            echo=False,
            # --- Connection Pool Configuration ---
            pool_size=5,          # Maintain 5 persistent connections
            max_overflow=10,      # Allow up to 10 extra connections under load
            pool_recycle=1800,    # Recycle connections every 30 min to avoid MySQL timeouts
            pool_pre_ping=True,   # Test connections before using them (prevents stale conn errors)
            pool_timeout=10,      # Wait up to 10s for a connection from the pool
        )
        AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
        logger.info("Database engine created successfully with pooling enabled.")
        return engine
    except Exception as exc:
        logger.error(f"Failed to initialize async DB engine: {exc}", exc_info=True)
        # Re-raise with context for clearer errors during app startup
        raise RuntimeError("Failed to initialize async DB engine") from exc

async def get_session():
    """Yield an async database session.
    
    If the engine is not initialized or the connection fails, raises an
    HTTPException(503) so endpoints return a proper error instead of crashing.
    """
    # Try to initialize engine if not ready
    if AsyncSessionLocal is None:
        try:
            init_engine()
        except Exception as exc:
            logger.error(f"Database engine initialization failed in get_session: {exc}", exc_info=True)
            raise HTTPException(
                status_code=503,
                detail="Database service is temporarily unavailable. Please try again later."
            )

    # Try to create and yield a session
    try:
        async with AsyncSessionLocal() as session:
            yield session
    except HTTPException:
        # Re-raise HTTPExceptions as-is (e.g. from endpoint logic)
        raise
    except Exception as exc:
        logger.error(f"Database session error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Database service is temporarily unavailable. Please try again later."
        )

def get_engine():
    """Return the async engine, initializing it if necessary."""
    if engine is None:
        return init_engine()
    return engine
