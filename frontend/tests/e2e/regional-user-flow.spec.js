import { expect, test } from '@playwright/test'

const regionSummaries = [
  {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    value_mean: null,
    value_min: null,
    value_max: null,
    pixel_count_valid: 0,
    quality_status: 'no_valid_pixels',
    unit: 'mol/m²',
    measurement_start_time: '2025-03-11T12:19:40+00:00',
    measurement_end_time: '2025-03-11T13:18:05+00:00',
    processing_run_id: 13,
    source_product_name:
      'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc',
  },
  {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    value_mean: 0.000031,
    value_min: 0.000012,
    value_max: 0.000052,
    pixel_count_valid: 41,
    quality_status: 'valid',
    unit: 'mol/m²',
    measurement_start_time: '2025-03-11T12:19:40+00:00',
    measurement_end_time: '2025-03-11T13:18:05+00:00',
    processing_run_id: 14,
    source_product_name:
      'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc',
  },
]

const regionDetails = {
  SI031: {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    geometry: null,
    latest_measurement: {
      value_mean: null,
      value_min: null,
      value_max: null,
      pixel_count_valid: 0,
      qa_threshold: 0.75,
      quality_status: 'no_valid_pixels',
      unit: 'mol/m²',
      measurement_start_time: '2025-03-11T12:19:40+00:00',
      measurement_end_time: '2025-03-11T13:18:05+00:00',
      processing_run_id: 13,
      source_product_id: 'product-si031',
      source_product_name:
        'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc',
    },
  },
  SI032: {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    geometry: null,
    latest_measurement: {
      value_mean: 0.000031,
      value_min: 0.000012,
      value_max: 0.000052,
      pixel_count_valid: 41,
      qa_threshold: 0.75,
      quality_status: 'valid',
      unit: 'mol/m²',
      measurement_start_time: '2025-03-11T12:19:40+00:00',
      measurement_end_time: '2025-03-11T13:18:05+00:00',
      processing_run_id: 14,
      source_product_id: 'product-si032',
      source_product_name:
        'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc',
    },
  },
}

const regionGeometries = [
  {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [16.0, 46.5],
          [16.8, 46.5],
          [16.8, 47.0],
          [16.0, 47.0],
          [16.0, 46.5],
        ],
      ],
    },
  },
  {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [15.1, 46.0],
          [16.0, 46.0],
          [16.0, 46.5],
          [15.1, 46.5],
          [15.1, 46.0],
        ],
      ],
    },
  },
]

test('covers the main regional dashboard flow', async ({ page }) => {
  await page.route('**/api/v1/regions/**', async route => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/latest-measurements')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(regionSummaries),
      })
      return
    }

    if (url.pathname.endsWith('/geometries')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(regionGeometries),
      })
      return
    }

    if (url.pathname.endsWith('/export.csv')) {
      const exportRegionCode = decodeURIComponent(url.pathname.split('/').at(-2) ?? '')
      const detail = regionDetails[exportRegionCode]
      const measurement = detail?.latest_measurement

      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'content-disposition': `attachment; filename="airwatch-region-${exportRegionCode}-latest.csv"`,
        },
        body: [
          'region_code,region_name,region_type,value_mean,quality_status,pixel_count_valid',
          [
            exportRegionCode,
            detail.region_name,
            detail.region_type,
            measurement.value_mean ?? '',
            measurement.quality_status,
            measurement.pixel_count_valid,
          ].join(','),
        ].join('\n'),
      })
      return
    }

    const regionCode = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
    const detail = regionDetails[regionCode]

    await route.fulfill({
      status: detail ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(detail ?? { detail: 'Region not found.' }),
    })
  })

  await page.goto('/')

  await expect(page.locator('.dashboard-header h1')).toContainText(/regijah/i)

  const regionSelect = page.getByLabel(/Statisti.*na regija/i)
  await expect(regionSelect).toHaveValue('SI032')
  await expect(
    page.getByLabel('Interaktivni Leaflet zemljevid slovenskih statističnih regij'),
  ).toBeVisible()
  await expect(page.locator('.map-selected-region')).toContainText('SI032')

  const latestMeasurementCard = page.locator('.metric-card')
  await expect(latestMeasurementCard.getByRole('heading', { name: 'Podravska' })).toBeVisible()
  await expect(latestMeasurementCard).toContainText('Veljavnih pikslov')
  await expect(latestMeasurementCard).toContainText('41')

  const detailsCard = page.locator('.detail-card')
  const exportLink = detailsCard.getByRole('link', { name: 'Izvozi CSV' })
  await expect(exportLink).toHaveAttribute(
    'href',
    'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI032/export.csv',
  )
  await expect(detailsCard).toContainText('Koda regije: SI032')

  await regionSelect.selectOption('SI031')

  await expect(page.locator('.map-selected-region')).toContainText('SI031')
  await expect(latestMeasurementCard.getByRole('heading', { name: 'Pomurska' })).toBeVisible()
  await expect(latestMeasurementCard).toContainText('Ni veljavnih podatkov za izbrano regijo')
  await expect(detailsCard).toContainText('Koda regije: SI031')
  await expect(exportLink).toHaveAttribute(
    'href',
    'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI031/export.csv',
  )

  const downloadPromise = page.waitForEvent('download')
  await exportLink.click()
  const download = await downloadPromise
  expect(download.url()).toContain('/api/v1/regions/SI031/export.csv')
})
