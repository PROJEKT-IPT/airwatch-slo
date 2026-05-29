from logging.config import fileConfig
import os
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=False)


def read_env_value(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name, default)
    return value.strip() if value is not None else None


def get_database_url() -> str:
    database_url = read_env_value("DATABASE_URL")
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url

    host = (
        read_env_value("DATABASE_HOST")
        or read_env_value("POSTGRES_HOST")
        or "127.0.0.1"
    )
    port = read_env_value("DATABASE_PORT") or read_env_value("POSTGRES_PORT") or "5432"
    database = read_env_value("POSTGRES_DB") or read_env_value("DATABASE_NAME") or "airwatch"
    user = read_env_value("POSTGRES_USER") or read_env_value("DATABASE_USER") or "postgres"
    password = read_env_value("POSTGRES_PASSWORD") or read_env_value("DATABASE_PASSWORD")

    if not password:
        raise RuntimeError("POSTGRES_PASSWORD or DATABASE_PASSWORD must be set for Alembic migrations")

    return (
        "postgresql://"
        f"{quote_plus(user)}:"
        f"{quote_plus(password)}@"
        f"{host}:{port}/"
        f"{quote_plus(database)}"
    )
def print_database_target() -> None:
    database_url = read_env_value("DATABASE_URL")
    if database_url:
        config.print_stdout("Alembic database target: DATABASE_URL is set")
        return

    host = (
        read_env_value("DATABASE_HOST")
        or read_env_value("POSTGRES_HOST")
        or "127.0.0.1"
    )
    port = read_env_value("DATABASE_PORT") or read_env_value("POSTGRES_PORT") or "5432"
    database = read_env_value("POSTGRES_DB") or read_env_value("DATABASE_NAME") or "airwatch"
    user = read_env_value("POSTGRES_USER") or read_env_value("DATABASE_USER") or "postgres"

    config.print_stdout(
        "Alembic database target: "
        f"host={host} "
        f"port={port} "
        f"database={database} "
        f"user={user}"
    )

def run_migrations_offline() -> None:
    print_database_target()
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    print_database_target()
    config.set_main_option("sqlalchemy.url", get_database_url())
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
