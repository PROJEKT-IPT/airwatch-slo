"""create processing_run table

Revision ID: 006_create_processing_run
Revises: 005_create_source_file
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "006_create_processing_run"
down_revision = "005_create_source_file"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "processing_run",
        sa.Column("id_processing_run", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("fk_source_file", sa.Integer(), nullable=False),
        sa.Column("run_status", sa.String(length=50), nullable=False),
        sa.Column("script_name", sa.String(length=255), nullable=False),
        sa.Column("script_version", sa.String(length=100), nullable=True),
        sa.Column("qa_threshold", sa.Numeric(5, 4), nullable=True),
        sa.Column("bbox_used", sa.Text(), nullable=True),
        sa.Column(
            "started_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("finished_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
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
            ["fk_source_file"],
            ["source_file.id_source_file"],
            name="fk_processing_run_source_file",
        ),
        sa.UniqueConstraint(
            "fk_source_file",
            "script_name",
            "script_version",
            "qa_threshold",
            "bbox_used",
            name="uq_processing_run_source_script",
        ),
    )


def downgrade() -> None:
    op.drop_table("processing_run")
