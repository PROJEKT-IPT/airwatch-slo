"""create region_measurement table

Revision ID: 007_create_region_measurement
Revises: 006_create_processing_run
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "007_create_region_measurement"
down_revision = "006_create_processing_run"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "region_measurement",
        sa.Column("id_region_measurement", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("fk_region", sa.Integer(), nullable=False),
        sa.Column("fk_indicator", sa.Integer(), nullable=False),
        sa.Column("fk_source_file", sa.Integer(), nullable=False),
        sa.Column("fk_processing_run", sa.Integer(), nullable=False),
        sa.Column("measurement_start_time", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("measurement_end_time", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("value_mean", sa.Numeric(), nullable=True),
        sa.Column("value_min", sa.Numeric(), nullable=True),
        sa.Column("value_max", sa.Numeric(), nullable=True),
        sa.Column("pixel_count_valid", sa.Integer(), nullable=False),
        sa.Column("qa_threshold", sa.Numeric(5, 4), nullable=True),
        sa.Column("quality_status", sa.String(length=50), nullable=True),
        sa.Column("unit", sa.String(length=50), nullable=False),
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
            ["fk_region"],
            ["region.id_region"],
            name="fk_region_measurement_region",
        ),
        sa.ForeignKeyConstraint(
            ["fk_indicator"],
            ["indicator.id_indicator"],
            name="fk_region_measurement_indicator",
        ),
        sa.ForeignKeyConstraint(
            ["fk_source_file"],
            ["source_file.id_source_file"],
            name="fk_region_measurement_source_file",
        ),
        sa.ForeignKeyConstraint(
            ["fk_processing_run"],
            ["processing_run.id_processing_run"],
            name="fk_region_measurement_processing_run",
        ),
        sa.UniqueConstraint(
            "fk_region",
            "fk_indicator",
            "fk_source_file",
            "fk_processing_run",
            name="uq_region_measurement_result",
        ),
    )
    op.create_index(
        "idx_region_measurement_region_indicator_time",
        "region_measurement",
        ["fk_region", "fk_indicator", "measurement_end_time"],
    )
    op.create_index(
        "idx_region_measurement_indicator_time",
        "region_measurement",
        ["fk_indicator", "measurement_end_time"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_region_measurement_indicator_time",
        table_name="region_measurement",
    )
    op.drop_index(
        "idx_region_measurement_region_indicator_time",
        table_name="region_measurement",
    )
    op.drop_table("region_measurement")
