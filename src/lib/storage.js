import { queueCloudStateWrite } from './cloudState';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function readStorageList(key) {
  const parsed = safeJsonParse(localStorage.getItem(key), []);
  if (!Array.isArray(parsed)) return [];
  if (key === 'goisiin_transactions') {
    const deletions = safeJsonParse(localStorage.getItem('goisiin_transaction_deletions'), []);
    const deletedIds = new Set((Array.isArray(deletions) ? deletions : [])
      .map((item) => String(item?.invoiceId || '').trim())
      .filter(Boolean));
    return parsed.filter((transaction) => !deletedIds.has(String(transaction?.invoiceId || '').trim())).slice(0, 500);
  }
  return parsed.slice(0, 500);
}

export function writeStorageList(key, value) {
  const safeValue = Array.isArray(value) ? value.slice(0, 1000) : [];
  localStorage.setItem(key, JSON.stringify(safeValue));
  queueCloudStateWrite(key, safeValue);
}

export function readUserTransactions(user) {
  const transactions = readStorageList('goisiin_transactions');
  if (!user?.email) return [];
  const userEmail = normalizeEmail(user.email);
  return transactions.filter((transaction) => normalizeEmail(transaction.userEmail) === userEmail);
}

export function findTransactionByInvoiceId(invoiceId) {
  if (!invoiceId) return null;
  return readStorageList('goisiin_transactions')
    .find((transaction) => transaction.invoiceId === invoiceId) || null;
}

export function normalizeStoredProducts(savedProducts, fallbackProducts) {
  const parsed = safeJsonParse(savedProducts, null);
  const normalize = (product) => ({
    active: true,
    ...product,
    denominations: Array.isArray(product?.denominations) ? product.denominations : [],
  });

  if (!Array.isArray(parsed)) {
    return fallbackProducts.map(normalize);
  }

  const mergedById = new Map(parsed.map((product) => [product.id, normalize(product)]));
  fallbackProducts.forEach((product) => {
    if (!mergedById.has(product.id)) {
      mergedById.set(product.id, normalize(product));
      return;
    }

    const savedProduct = mergedById.get(product.id);
    const fallbackDenominations = Array.isArray(product.denominations) ? product.denominations : [];
    const savedDenominationsById = new Map(
      (Array.isArray(savedProduct.denominations) ? savedProduct.denominations : [])
        .filter((denom) => denom?.id)
        .map((denom) => [denom.id, denom]),
    );

    const mergedDenominations = fallbackDenominations.map((denom) => {
      const savedDenom = savedDenominationsById.get(denom.id) || {};
      return {
        ...denom,
        originalPrice: Number.isFinite(Number(savedDenom.originalPrice)) ? Number(savedDenom.originalPrice) : denom.originalPrice,
        price: Number.isFinite(Number(savedDenom.price)) ? Number(savedDenom.price) : denom.price,
        points: Number.isFinite(Number(savedDenom.points)) ? Number(savedDenom.points) : denom.points,
        stock: Number.isFinite(Number(savedDenom.stock)) ? Number(savedDenom.stock) : denom.stock,
        description: typeof savedDenom.description === 'string' && savedDenom.description.trim()
          ? savedDenom.description
          : denom.description,
      };
    });

    mergedById.set(product.id, normalize({
      ...product,
      active: savedProduct.active !== false,
      popular: typeof savedProduct.popular === 'boolean' ? savedProduct.popular : product.popular,
      discount: typeof savedProduct.discount === 'string' ? savedProduct.discount : product.discount,
      denominations: mergedDenominations,
    }));
  });

  return Array.from(mergedById.values());
}
