"""seed sprint 1 initial data

Revision ID: 008_seed_sprint_1_initial_data
Revises: 007_create_region_measurement
Create Date: 2026-05-09
"""

from alembic import op


revision = "008_seed_sprint_1_initial_data"
down_revision = "007_create_region_measurement"
branch_labels = None
depends_on = None


EXTERNAL_PRODUCT_ID = "b898f30a-1d6e-4c6c-bdc2-9933a06e316e"


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO region (
            region_name,
            region_code,
            region_type,
            bbox_lat_min,
            bbox_lat_max,
            bbox_lon_min,
            bbox_lon_max
        )
        VALUES (
            'Slovenia bbox',
            'SI_BBOX',
            'test_bbox',
            45.4,
            46.9,
            13.4,
            16.6
        )
        ON CONFLICT (region_code) DO UPDATE SET
            region_name = EXCLUDED.region_name,
            region_type = EXCLUDED.region_type,
            bbox_lat_min = EXCLUDED.bbox_lat_min,
            bbox_lat_max = EXCLUDED.bbox_lat_max,
            bbox_lon_min = EXCLUDED.bbox_lon_min,
            bbox_lon_max = EXCLUDED.bbox_lon_max,
            updated_at = NOW()
        """
    )

    op.execute(
        """
        INSERT INTO indicator (
            indicator_code,
            indicator_name,
            description,
            unit,
            is_active
        )
        VALUES (
            'NO2',
            'Nitrogen dioxide',
            'Tropospheric nitrogen dioxide column from Sentinel-5P TROPOMI.',
            'mol/m²',
            TRUE
        )
        ON CONFLICT (indicator_code) DO UPDATE SET
            indicator_name = EXCLUDED.indicator_name,
            description = EXCLUDED.description,
            unit = EXCLUDED.unit,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        """
    )

    op.execute(
        """
        INSERT INTO data_source (
            source_name,
            provider,
            access_url,
            license_name,
            description
        )
        VALUES (
            'Copernicus Data Space',
            'European Union / ESA',
            'https://dataspace.copernicus.eu/',
            'Copernicus data policy',
            'Copernicus Data Space Ecosystem catalogue and download service.'
        )
        ON CONFLICT (source_name) DO UPDATE SET
            provider = EXCLUDED.provider,
            access_url = EXCLUDED.access_url,
            license_name = EXCLUDED.license_name,
            description = EXCLUDED.description,
            updated_at = NOW()
        """
    )

    op.execute(
        """
        INSERT INTO data_product (
            fk_data_source,
            product_code,
            platform,
            instrument,
            processing_level,
            product_group,
            variable_name,
            quality_variable_name,
            description
        )
        SELECT
            ds.id_data_source,
            'S5P_OFFL_L2__NO2',
            'Sentinel-5P',
            'TROPOMI',
            'L2',
            'PRODUCT',
            'nitrogendioxide_tropospheric_column',
            'qa_value',
            'Sentinel-5P OFFL Level 2 nitrogen dioxide product.'
        FROM data_source ds
        WHERE ds.source_name = 'Copernicus Data Space'
        ON CONFLICT (product_code) DO UPDATE SET
            fk_data_source = EXCLUDED.fk_data_source,
            platform = EXCLUDED.platform,
            instrument = EXCLUDED.instrument,
            processing_level = EXCLUDED.processing_level,
            product_group = EXCLUDED.product_group,
            variable_name = EXCLUDED.variable_name,
            quality_variable_name = EXCLUDED.quality_variable_name,
            description = EXCLUDED.description,
            updated_at = NOW()
        """
    )

    op.execute(
        f"""
        INSERT INTO source_file (
            fk_data_product,
            external_product_id,
            product_name,
            file_format,
            file_size_bytes,
            sensing_start_at,
            sensing_end_at,
            download_status,
            downloaded_at
        )
        SELECT
            dp.id_data_product,
            '{EXTERNAL_PRODUCT_ID}',
            'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc',
            'NetCDF',
            622854144,
            '2025-03-11T12:19:40Z'::TIMESTAMP WITH TIME ZONE,
            '2025-03-11T13:18:05Z'::TIMESTAMP WITH TIME ZONE,
            'downloaded',
            NOW()
        FROM data_product dp
        WHERE dp.product_code = 'S5P_OFFL_L2__NO2'
        ON CONFLICT (external_product_id) DO UPDATE SET
            fk_data_product = EXCLUDED.fk_data_product,
            product_name = EXCLUDED.product_name,
            file_format = EXCLUDED.file_format,
            file_size_bytes = EXCLUDED.file_size_bytes,
            sensing_start_at = EXCLUDED.sensing_start_at,
            sensing_end_at = EXCLUDED.sensing_end_at,
            download_status = EXCLUDED.download_status,
            updated_at = NOW()
        """
    )

    op.execute(
        f"""
        INSERT INTO processing_run (
            fk_source_file,
            run_status,
            script_name,
            script_version,
            qa_threshold,
            bbox_used,
            started_at,
            finished_at
        )
        SELECT
            sf.id_source_file,
            'success',
            'process_no2_slovenia_bbox.py',
            'sprint_1_poc',
            0.75,
            'lat 45.4-46.9, lon 13.4-16.6',
            NOW(),
            NOW()
        FROM source_file sf
        WHERE sf.external_product_id = '{EXTERNAL_PRODUCT_ID}'
        ON CONFLICT (
            fk_source_file,
            script_name,
            script_version,
            qa_threshold,
            bbox_used
        ) DO UPDATE SET
            run_status = EXCLUDED.run_status,
            finished_at = EXCLUDED.finished_at,
            error_message = NULL,
            updated_at = NOW()
        """
    )

    op.execute(
        f"""
        INSERT INTO region_measurement (
            fk_region,
            fk_indicator,
            fk_source_file,
            fk_processing_run,
            measurement_start_time,
            measurement_end_time,
            value_mean,
            value_min,
            value_max,
            pixel_count_valid,
            qa_threshold,
            quality_status,
            unit
        )
        SELECT
            r.id_region,
            i.id_indicator,
            sf.id_source_file,
            pr.id_processing_run,
            '2025-03-11T12:19:40Z'::TIMESTAMP WITH TIME ZONE,
            '2025-03-11T13:18:05Z'::TIMESTAMP WITH TIME ZONE,
            3.306649159640074e-05,
            1.130456894316012e-05,
            5.404165858635679e-05,
            69,
            0.75,
            'valid',
            'mol/m²'
        FROM region r
        CROSS JOIN indicator i
        CROSS JOIN source_file sf
        JOIN processing_run pr
            ON pr.fk_source_file = sf.id_source_file
            AND pr.script_name = 'process_no2_slovenia_bbox.py'
            AND pr.script_version = 'sprint_1_poc'
            AND pr.qa_threshold = 0.75
            AND pr.bbox_used = 'lat 45.4-46.9, lon 13.4-16.6'
        WHERE r.region_code = 'SI_BBOX'
            AND i.indicator_code = 'NO2'
            AND sf.external_product_id = '{EXTERNAL_PRODUCT_ID}'
        ON CONFLICT (
            fk_region,
            fk_indicator,
            fk_source_file,
            fk_processing_run
        ) DO UPDATE SET
            measurement_start_time = EXCLUDED.measurement_start_time,
            measurement_end_time = EXCLUDED.measurement_end_time,
            value_mean = EXCLUDED.value_mean,
            value_min = EXCLUDED.value_min,
            value_max = EXCLUDED.value_max,
            pixel_count_valid = EXCLUDED.pixel_count_valid,
            qa_threshold = EXCLUDED.qa_threshold,
            quality_status = EXCLUDED.quality_status,
            unit = EXCLUDED.unit,
            updated_at = NOW()
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        DELETE FROM region_measurement rm
        USING region r, indicator i, source_file sf, processing_run pr
        WHERE rm.fk_region = r.id_region
            AND rm.fk_indicator = i.id_indicator
            AND rm.fk_source_file = sf.id_source_file
            AND rm.fk_processing_run = pr.id_processing_run
            AND r.region_code = 'SI_BBOX'
            AND i.indicator_code = 'NO2'
            AND sf.external_product_id = '{EXTERNAL_PRODUCT_ID}'
            AND pr.script_name = 'process_no2_slovenia_bbox.py'
            AND pr.script_version = 'sprint_1_poc'
        """
    )
    op.execute(
        f"""
        DELETE FROM processing_run pr
        USING source_file sf
        WHERE pr.fk_source_file = sf.id_source_file
            AND sf.external_product_id = '{EXTERNAL_PRODUCT_ID}'
            AND pr.script_name = 'process_no2_slovenia_bbox.py'
            AND pr.script_version = 'sprint_1_poc'
            AND pr.qa_threshold = 0.75
            AND pr.bbox_used = 'lat 45.4-46.9, lon 13.4-16.6'
        """
    )
    op.execute(
        f"DELETE FROM source_file WHERE external_product_id = '{EXTERNAL_PRODUCT_ID}'"
    )
    op.execute("DELETE FROM data_product WHERE product_code = 'S5P_OFFL_L2__NO2'")
    op.execute("DELETE FROM data_source WHERE source_name = 'Copernicus Data Space'")
    op.execute("DELETE FROM indicator WHERE indicator_code = 'NO2'")
    op.execute("DELETE FROM region WHERE region_code = 'SI_BBOX'")
