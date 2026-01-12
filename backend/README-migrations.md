Alembic setup

This project is configured to use Alembic for schema migrations.

Quick start:

1. Ensure alembic is installed in your environment:
   pip install alembic

2. Initialize (already prepared):
   alembic revision --autogenerate -m "create tables"

3. Apply migrations:
   alembic upgrade head

Notes:
- The alembic env is configured to use `backend.db.SQLALCHEMY_DATABASE_URL` for the DB URL and `backend.db.Base.metadata` for autogeneration.
- If you use a virtual environment, ensure the environment variables (SQLALCHEMY_DATABASE_URL) are available when running alembic.
- For MySQL: the app uses the async driver `asyncmy` at runtime (URL prefix `mysql+asyncmy://`), while Alembic replaces that with `pymysql` for synchronous migrations (`mysql+pymysql://`).
- If your DB password contains special characters (e.g., `@`), URL-encode it (the code will also URL-encode when building from `MYSQL_*` vars).
