"""create data_source table

Revision ID: 003_create_data_source
Revises: 002_create_indicator
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "003_create_data_source"
down_revision = "002_create_indicator"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_source",
        sa.Column("id_data_source", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("source_name", sa.String(length=255), nullable=False),
        sa.Column("provider", sa.String(length=255), nullable=False),
        sa.Column("access_url", sa.Text(), nullable=True),
        sa.Column("license_name", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.UniqueConstraint("source_name", name="uq_data_source_source_name"),
    )


def downgrade() -> None:
    op.drop_table("data_source")
