const TEXT_ALIGN = /^text-align:\s*(left|center|right|justify)\s*;?$/i;
const COLOR = /^color:\s*(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))\s*;?$/i;
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

const PLAIN_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "ul", "ol", "li",
  "blockquote", "code", "pre", "hr", "span", "a",
]);
const VOID_TAGS = new Set(["br", "hr"]);

function readAttributes(raw: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) attributes[match[1].toLowerCase()] = match[2];
  return attributes;
}

function escapeText(text: string) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function sanitizeHtml(input: string): string {
  const tagPattern = /<(\/?)([a-zA-Z0-9]+)([^>]*)>/g;
  let output = "";
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(input))) {
    output += escapeText(input.slice(last, match.index));
    last = match.index + match[0].length;

    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (!PLAIN_TAGS.has(tag)) continue;

    if (closing) {
      if (!VOID_TAGS.has(tag)) output += `</${tag}>`;
      continue;
    }

    const attributes = readAttributes(match[3]);
    let rebuilt = `<${tag}`;

    if (tag === "a" && attributes.href && SAFE_LINK.test(attributes.href.trim())) {
      rebuilt += ` href="${escapeAttribute(attributes.href.trim())}" target="_blank" rel="noopener noreferrer"`;
    }

    if (attributes.style) {
      const style = attributes.style.trim();
      if ((tag === "p" || tag === "h1" || tag === "h2" || tag === "h3") && TEXT_ALIGN.test(style)) {
        rebuilt += ` style="${escapeAttribute(style)}"`;
      } else if (tag === "span" && COLOR.test(style)) {
        rebuilt += ` style="${escapeAttribute(style)}"`;
      }
    }

    output += `${rebuilt}>`;
  }

  output += escapeText(input.slice(last));
  return output;
}
