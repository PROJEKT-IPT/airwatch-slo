"""create data_product table

Revision ID: 004_create_data_product
Revises: 003_create_data_source
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "004_create_data_product"
down_revision = "003_create_data_source"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_product",
        sa.Column("id_data_product", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("fk_data_source", sa.Integer(), nullable=False),
        sa.Column("product_code", sa.String(length=150), nullable=False),
        sa.Column("platform", sa.String(length=100), nullable=False),
        sa.Column("instrument", sa.String(length=100), nullable=False),
        sa.Column("processing_level", sa.String(length=50), nullable=False),
        sa.Column("variable_name", sa.String(length=255), nullable=False),
        sa.Column("quality_variable_name", sa.String(length=255), nullable=True),
        sa.Column("product_group", sa.String(length=100), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["fk_data_source"],
            ["data_source.id_data_source"],
            name="fk_data_product_data_source",
        ),
        sa.UniqueConstraint("product_code", name="uq_data_product_product_code"),
    )


def downgrade() -> None:
    op.drop_table("data_product")
