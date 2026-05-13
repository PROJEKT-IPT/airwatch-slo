"""convert region geometry to postgis multipolygon

Revision ID: 009_region_geometry_postgis
Revises: 008_seed_sprint_1_initial_data
Create Date: 2026-05-10
"""

from alembic import op


revision = "009_region_geometry_postgis"
down_revision = "008_seed_sprint_1_initial_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute(
        """
        ALTER TABLE region
        ALTER COLUMN geometry TYPE geometry(MULTIPOLYGON, 4326)
        USING
            CASE
                WHEN geometry IS NULL OR BTRIM(geometry) = '' THEN NULL
                WHEN BTRIM(geometry) LIKE '{%' THEN
                    ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(geometry)), 4326)
                WHEN BTRIM(geometry) ~ '^[0-9A-Fa-f]+$' THEN
                    ST_SetSRID(ST_Multi(ST_GeomFromWKB(DECODE(BTRIM(geometry), 'hex'))), 4326)
                ELSE
                    ST_SetSRID(ST_Multi(ST_GeomFromText(geometry)), 4326)
            END
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE region
        ALTER COLUMN geometry TYPE TEXT
        USING
            CASE
                WHEN geometry IS NULL THEN NULL
                ELSE ST_AsGeoJSON(geometry)
            END
        """
    )
