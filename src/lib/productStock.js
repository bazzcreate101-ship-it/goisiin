export const AUTO_RESTOCK_THRESHOLD = 3;
export const AUTO_RESTOCK_MIN = 8;
export const AUTO_RESTOCK_MAX = 25;

export const randomRestockValue = () =>
  Math.floor(Math.random() * (AUTO_RESTOCK_MAX - AUTO_RESTOCK_MIN + 1)) + AUTO_RESTOCK_MIN;

export const hasManagedStock = (product) =>
  product.denominations?.some((denom) => Number.isFinite(Number(denom.stock)));

export const countLowStockItems = (product) =>
  product.denominations?.filter((denom) => (
    Number.isFinite(Number(denom.stock)) && Number(denom.stock) < AUTO_RESTOCK_THRESHOLD
  )).length || 0;

export function restockLowStockProduct(product) {
  if (!hasManagedStock(product)) return { product, changed: 0 };

  let changed = 0;
  const denominations = product.denominations.map((denom) => {
    const currentStock = Number(denom.stock);
    if (Number.isFinite(currentStock) && currentStock < AUTO_RESTOCK_THRESHOLD) {
      changed += 1;
      return { ...denom, stock: randomRestockValue() };
    }
    return denom;
  });

  return { product: { ...product, denominations }, changed };
}

export function autoRestockProducts(products) {
  let changed = 0;
  const nextProducts = products.map((product) => {
    const result = restockLowStockProduct(product);
    changed += result.changed;
    return result.product;
  });

  return { products: changed > 0 ? nextProducts : products, changed };
}

export function decrementProductStock(products, productId, denominationId) {
  let changed = false;
  const nextProducts = products.map((product) => {
    if (product.id !== productId || !Array.isArray(product.denominations)) return product;

    const denominations = product.denominations.map((denom) => {
      if (denom.id !== denominationId) return denom;
      const currentStock = Number(denom.stock);
      if (!Number.isFinite(currentStock)) return denom;
      changed = true;
      return { ...denom, stock: Math.max(0, currentStock - 1) };
    });

    return { ...product, denominations };
  });

  return { products: changed ? nextProducts : products, changed };
}
