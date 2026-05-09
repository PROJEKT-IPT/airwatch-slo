"""create indicator table

Revision ID: 002_create_indicator
Revises: 001_create_region
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "002_create_indicator"
down_revision = "001_create_region"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "indicator",
        sa.Column("id_indicator", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("indicator_code", sa.String(length=100), nullable=False),
        sa.Column("indicator_name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("unit", sa.String(length=50), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("TRUE"),
        ),
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
        sa.UniqueConstraint("indicator_code", name="uq_indicator_indicator_code"),
    )


def downgrade() -> None:
    op.drop_table("indicator")
