// bytes.js：字节序标记与四字节取值（原生 API）
export function markOf(hex) {
  const mark = parseInt(String(hex).slice(0, 2), 16);
  if (mark === 0) return 0;
  if (mark === 1) return 1;
  return -1;
}

export function valueOf(hex, mark) {
  const payload = String(hex).slice(2, 10);
  if (mark === 1) {
    const swapped = payload.match(/../g).reverse().join("");
    return parseInt(swapped, 16);
  }
  return parseInt(payload, 16);
}
