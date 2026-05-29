import os
from pathlib import Path
from typing import Generator, Optional
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env", override=False)


def read_env_value(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name, default)
    return value.strip() if value is not None else None


def build_database_url() -> str:
    host = (
        read_env_value("DATABASE_HOST")
        or read_env_value("POSTGRES_HOST")
        or "127.0.0.1"
    )
    port = read_env_value("DATABASE_PORT") or read_env_value("POSTGRES_PORT") or "5432"
    database = read_env_value("POSTGRES_DB") or read_env_value("DATABASE_NAME") or "airwatch"
    user = read_env_value("POSTGRES_USER") or read_env_value("DATABASE_USER") or "postgres"
    password = read_env_value("POSTGRES_PASSWORD") or read_env_value("DATABASE_PASSWORD")

    print(f"DEBUG DATABASE_HOST={read_env_value('DATABASE_HOST')}", flush=True)
    print(f"DEBUG POSTGRES_HOST={read_env_value('POSTGRES_HOST')}", flush=True)
    print(f"DEBUG selected host={host}", flush=True)

    if not password:
        raise RuntimeError("POSTGRES_PASSWORD or DATABASE_PASSWORD must be set for backend database access")

    return (
        "postgresql://"
        f"{quote_plus(user)}:{quote_plus(password)}@"
        f"{host}:{port}/"
        f"{quote_plus(database)}"
    )


engine = create_engine(build_database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
