import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import create_engine

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)

# Load .env so Alembic sees MYSQL/SQLALCHEMY vars when run from the shell
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).resolve().parents[1] / '.env')

# Provide your model's MetaData object here for 'autogenerate' support
# from your app import yourmodel
from backend.db import SQLALCHEMY_DATABASE_URL
from backend.db import Base
# Import models so `Base.metadata` is populated for autogeneration
import backend.models

# Convert async DB URLs to a sync driver for Alembic (e.g., asyncmy -> pymysql,
# aiosqlite -> sqlite) so the offline/online migration runners use a sync
# DBAPI that Alembic can work with.
sync_url = SQLALCHEMY_DATABASE_URL
# Convert async driver prefixes to the sync DBAPI used by Alembic
# e.g. asyncmy -> pymysql, aiomysql -> pymysql, aiosqlite -> sqlite
if sync_url and "+asyncmy" in sync_url:
    sync_url = sync_url.replace("+asyncmy", "+pymysql")
if sync_url and "+aiomysql" in sync_url:
    sync_url = sync_url.replace("+aiomysql", "+pymysql")
if sync_url and "+aiosqlite" in sync_url:
    sync_url = sync_url.replace("+aiosqlite", "")

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = sync_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = create_engine(sync_url)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
