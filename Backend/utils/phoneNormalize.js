function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  return digits.slice(-10);
}

module.exports = { normalizePhone };
