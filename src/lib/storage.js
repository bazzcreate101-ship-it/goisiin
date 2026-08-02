export function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function readStorageList(key) {
  const parsed = safeJsonParse(localStorage.getItem(key), []);
  return Array.isArray(parsed) ? parsed.slice(0, 500) : [];
}

export function writeStorageList(key, value) {
  localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value.slice(0, 500) : []));
}

export function readUserTransactions(user) {
  const transactions = readStorageList('goisiin_transactions');
  if (!user?.email) return [];
  return transactions.filter((transaction) => transaction.userEmail === user.email);
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
    const shouldReplaceStaleAiCatalog = product.id === 'kebutuhan-ai' && (
      savedText.includes('sharing') ||
      savedText.includes('sementara') ||
      savedText.includes('kiro') ||
      savedText.includes('leonardo') ||
      savedText.includes('kling') ||
      savedText.includes('perplexity') ||
      savedText.includes('dola ai') ||
      savedText.includes('grok super')
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
