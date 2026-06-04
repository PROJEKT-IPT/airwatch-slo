"""create region table

Revision ID: 001_create_region
Revises:
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "001_create_region"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "region",
        sa.Column("id_region", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("region_name", sa.String(length=255), nullable=False),
        sa.Column("region_code", sa.String(length=100), nullable=False),
        sa.Column("region_type", sa.String(length=100), nullable=False),
        sa.Column("geometry", sa.Text(), nullable=True),
        sa.Column("bbox_lat_min", sa.Numeric(9, 6), nullable=True),
        sa.Column("bbox_lat_max", sa.Numeric(9, 6), nullable=True),
        sa.Column("bbox_lon_min", sa.Numeric(9, 6), nullable=True),
        sa.Column("bbox_lon_max", sa.Numeric(9, 6), nullable=True),
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
        sa.UniqueConstraint("region_code", name="uq_region_region_code"),
    )
    op.create_index("idx_region_region_code", "region", ["region_code"])


def downgrade() -> None:
    op.drop_index("idx_region_region_code", table_name="region")
    op.drop_table("region")
