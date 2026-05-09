"""create source_file table

Revision ID: 005_create_source_file
Revises: 004_create_data_product
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "005_create_source_file"
down_revision = "004_create_data_product"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "source_file",
        sa.Column("id_source_file", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("fk_data_product", sa.Integer(), nullable=False),
        sa.Column("external_product_id", sa.String(length=100), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("local_file_path", sa.Text(), nullable=True),
        sa.Column("file_format", sa.String(length=50), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("checksum", sa.String(length=255), nullable=True),
        sa.Column("sensing_start_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("sensing_end_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("downloaded_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "download_status",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'pending'"),
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
        sa.ForeignKeyConstraint(
            ["fk_data_product"],
            ["data_product.id_data_product"],
            name="fk_source_file_data_product",
        ),
        sa.UniqueConstraint("external_product_id", name="uq_source_file_external_product_id"),
    )
    op.create_index(
        "idx_source_file_external_product_id",
        "source_file",
        ["external_product_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_source_file_external_product_id", table_name="source_file")
    op.drop_table("source_file")
