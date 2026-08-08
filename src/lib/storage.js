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
    const savedText = JSON.stringify(savedProduct).toLowerCase();
    const fallbackDenominationIds = new Set((product.denominations || []).map((denom) => denom.id));
    const savedDenominationIds = new Set((savedProduct.denominations || []).map((denom) => denom.id));
    const savedHasUnknownDenomination = (savedProduct.denominations || [])
      .some((denom) => !fallbackDenominationIds.has(denom.id));
    const savedMissingCurrentDenomination = (product.denominations || [])
      .some((denom) => !savedDenominationIds.has(denom.id));
    const shouldReplaceStaleAiCatalog = product.id === 'kebutuhan-ai' && (
      savedText.includes('sharing') ||
      savedHasUnknownDenomination ||
      savedMissingCurrentDenomination
    );

    if (shouldReplaceStaleAiCatalog) {
      mergedById.set(product.id, normalize({
        ...product,
        active: savedProduct.active !== false,
        popular: savedProduct.popular ?? product.popular,
      }));
    }
  });

  return Array.from(mergedById.values());
}
