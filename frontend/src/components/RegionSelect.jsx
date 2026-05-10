function RegionSelect({
  regions,
  selectedRegionCode,
  onRegionChange,
  isLoading,
  error,
}) {
  if (isLoading) {
    return <p style={styles.muted}>Loading regions...</p>
  }

  return (
    <div style={styles.field}>
      <label htmlFor="region-select" style={styles.label}>
        Region
      </label>
      <select
        id="region-select"
        value={selectedRegionCode}
        onChange={event => onRegionChange(event.target.value)}
        style={styles.select}
      >
        <option value="">Select a region</option>
        {regions.map(region => (
          <option key={region.region_code} value={region.region_code}>
            {region.region_name}
          </option>
        ))}
      </select>
      {error ? <p style={styles.error}>{error}</p> : null}
    </div>
  )
}

const styles = {
  field: {
    display: 'grid',
    gap: '0.5rem',
    maxWidth: '28rem',
    margin: '0 auto',
    textAlign: 'left',
  },
  label: {
    fontWeight: 600,
  },
  select: {
    width: '100%',
    padding: '0.7rem 0.8rem',
    border: '1px solid #b8c2cc',
    borderRadius: '6px',
    font: 'inherit',
    background: '#ffffff',
  },
  muted: {
    color: '#53616f',
  },
  error: {
    margin: 0,
    color: '#b42318',
    fontSize: '0.9rem',
  },
}

export default RegionSelect
