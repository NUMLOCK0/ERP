export function getDefaultUnit(units: any[]) {
  return units.find(unit => Number(unit.is_default) === 1) || null
}

export function getDefaultUnitName(units: any[], fallback = '个') {
  return getDefaultUnit(units)?.name || units[0]?.name || fallback
}

export function normalizeProductUnits(product: any) {
  if (!product?.units) return []
  if (Array.isArray(product.units)) return product.units
  if (typeof product.units === 'string') {
    try {
      const parsed = JSON.parse(product.units)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function getPreferredProductUnit(product: any, units: any[]) {
  const productUnits = normalizeProductUnits(product)
  const defaultUnit = getDefaultUnit(units)
  if (defaultUnit) {
    const matched = productUnits.find((unit: any) => (
      Number(unit.unit_id) === Number(defaultUnit.id)
      || String(unit.unit_name || '') === String(defaultUnit.name)
    ))
    if (matched) return matched
    if (Number(product?.unit_id) === Number(defaultUnit.id)) {
      return {
        unit_id: defaultUnit.id,
        unit_name: defaultUnit.name,
        base_quantity: product?.base_quantity || 1
      }
    }
  }

  return productUnits[0] || {
    unit_id: product?.unit_id || null,
    unit_name: product?.unit_name || getDefaultUnitName(units),
    base_quantity: product?.base_quantity || 1
  }
}
