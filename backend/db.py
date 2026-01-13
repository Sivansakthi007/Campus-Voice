import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Ensure local .env is loaded so importing this module (server, Alembic, etc.)
# sees the expected MYSQL_ / SQLALCHEMY_* variables.
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).resolve().parents[0] / '.env')

SQLALCHEMY_DATABASE_URL = os.environ.get("SQLALCHEMY_DATABASE_URL") or os.environ.get("DATABASE_URL")

# If an explicit DB URL is not provided, try building one from MYSQL_* env vars
# Note: URL-encode the password in case it contains special characters.
from urllib.parse import quote_plus

if not SQLALCHEMY_DATABASE_URL:
    mysql_user = os.environ.get("MYSQL_USER")
    if mysql_user:
        mysql_password = quote_plus(os.environ.get("MYSQL_PASSWORD", "sakthi2005"))
        mysql_host = os.environ.get("MYSQL_HOST", "localhost")
        mysql_port = os.environ.get("MYSQL_PORT", "3306")
        mysql_db = os.environ.get("MYSQL_DB", "campus_voice_db")
        # Using asyncmy (already in requirements) for async MySQL connections
        SQLALCHEMY_DATABASE_URL = f"mysql+aiomysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}"
    else:
        # Fallback to a local SQLite DB for development/testing if no URL provided
        SQLALCHEMY_DATABASE_URL = "mysql+aiomysql://root:password@localhost/campus_voice_db"


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
        engine = create_async_engine(SQLALCHEMY_DATABASE_URL, future=True, echo=False)
        AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
        return engine
    except Exception as exc:
        # Re-raise with context for clearer errors during app startup
        raise RuntimeError("Failed to initialize async DB engine") from exc

async def get_session():
    if AsyncSessionLocal is None:
        # Try initializing now (for runtime). This will raise a useful error if it fails.
        init_engine()
    async with AsyncSessionLocal() as session:
        yield session

def get_engine():
    """Return the async engine, initializing it if necessary."""
    if engine is None:
        return init_engine()
    return engine
