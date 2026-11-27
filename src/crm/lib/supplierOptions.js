const activeSupplier = (supplier) => supplier.status !== 'Inactive';
export const supplierTypes = (supplier) => (Array.isArray(supplier?.type) ? supplier.type : supplier?.type ? [supplier.type] : []).filter(Boolean);

/** Supplier records are filtered at their point of use, never globally. */
export function supplierOptionsFor(suppliers = [], type) {
  const allowedTypes = (Array.isArray(type) ? type : [type])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  return suppliers
    .filter((supplier) => activeSupplier(supplier) && supplierTypes(supplier)
      .some((supplierType) => allowedTypes.includes(String(supplierType || '').trim().toLowerCase())))
    .map((supplier) => ({ value: supplier.id, label: supplier.name }));
}
