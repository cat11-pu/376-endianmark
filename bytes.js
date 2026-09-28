// bytes.js：标记与取值（原生 API）
// hex 为十位十六进制：头两位标记（0 大端、1 小端），后八位是四字节字段。
export function markOf(hex) {
  const mark = parseInt(hex.slice(0, 2), 16);
  if (mark === 0) return 0;
  if (mark === 1) return 1;
  return -1;
}

export function valueOf(hex, mark) {
  const body = hex.slice(2, 10);
  if (mark === 1) {
    // 小端：后八位两两一组反过来再读
    const reversed = body.slice(6, 8) + body.slice(4, 6) + body.slice(2, 4) + body.slice(0, 2);
    return parseInt(reversed, 16);
  }
  // 大端：后八位按原顺序读
  return parseInt(body, 16);
}
