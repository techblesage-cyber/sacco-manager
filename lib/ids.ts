import crypto from "node:crypto";

function stamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

export function reference(prefix: string, bytes = 4) {
  return `${prefix}-${stamp()}-${crypto.randomBytes(bytes).toString("hex").toUpperCase()}`;
}
