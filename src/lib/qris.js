const BASE_QRIS_PAYLOAD = '00020101021126570011ID.DANA.WWW011893600915303270621302090327062130303UMI51440014ID.CO.QRIS.WWW0215ID10265345984810303UMI5204481453033605802ID5923Perseroan geman digital6015Kota Jakarta Pu6105101206304A056';

function crc16Ccitt(value) {
  let crc = 0xffff;
  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function removeTag(payload, tag) {
  let i = 0;
  let output = '';
  while (i < payload.length) {
    const currentTag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    const chunk = payload.slice(i, i + 4 + len);
    if (currentTag !== tag) output += chunk;
    i += 4 + len;
  }
  return output;
}

function replaceTag(payload, tag, rawValue) {
  let i = 0;
  let output = '';
  let replaced = false;
  const nextChunk = `${tag}${String(rawValue.length).padStart(2, '0')}${rawValue}`;
  while (i < payload.length) {
    const currentTag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (Number.isNaN(len)) break;
    const chunk = payload.slice(i, i + 4 + len);
    output += currentTag === tag ? nextChunk : chunk;
    replaced = replaced || currentTag === tag;
    i += 4 + len;
  }
  return replaced ? output : `${output}${nextChunk}`;
}

function insertBeforeTag(payload, tag, chunk) {
  let i = 0;
  while (i < payload.length) {
    const currentTag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (currentTag === tag) {
      return payload.slice(0, i) + chunk + payload.slice(i);
    }
    i += 4 + len;
  }
  return payload + chunk;
}

export function buildDynamicQrisPayload(total) {
  const amount = Math.max(1, Math.round(Number(total || 0))).toFixed(2);
  const withoutCrc = BASE_QRIS_PAYLOAD.replace(/6304[0-9A-Fa-f]{4}$/, '');
  let body = removeTag(withoutCrc, '54');
  body = replaceTag(body, '01', '12');
  const amountChunk = `54${String(amount.length).padStart(2, '0')}${amount}`;
  body = insertBeforeTag(removeTag(body, '54'), '58', amountChunk);
  const crcInput = `${body}6304`;
  return `${crcInput}${crc16Ccitt(crcInput)}`;
}

export function makeRetailBarcodeValue(invoiceId) {
  const seed = String(invoiceId || Date.now()).replace(/\D/g, '').slice(-10).padStart(10, '0');
  return `899${seed}${Math.floor(100 + Math.random() * 900)}`;
}
