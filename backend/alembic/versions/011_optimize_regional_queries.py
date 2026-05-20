"""optimize common regional queries

Revision ID: 011_optimize_regional_queries
Revises: 010_seed_statistical_regions
Create Date: 2026-05-20
"""

from alembic import op


revision = "011_optimize_regional_queries"
down_revision = "010_seed_statistical_regions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_region_region_type_code
        ON region (region_type, region_code)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_region_geometry_gist
        ON region
        USING GIST (geometry)
        WHERE geometry IS NOT NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_region_measurement_region_indicator_latest
        ON region_measurement (
            fk_region,
            fk_indicator,
            measurement_end_time DESC,
            measurement_start_time DESC,
            id_region_measurement DESC
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_region_measurement_indicator_region_latest
        ON region_measurement (
            fk_indicator,
            fk_region,
            measurement_end_time DESC,
            measurement_start_time DESC,
            id_region_measurement DESC
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_region_measurement_indicator_region_latest")
    op.execute("DROP INDEX IF EXISTS idx_region_measurement_region_indicator_latest")
    op.execute("DROP INDEX IF EXISTS idx_region_geometry_gist")
    op.execute("DROP INDEX IF EXISTS idx_region_region_type_code")
