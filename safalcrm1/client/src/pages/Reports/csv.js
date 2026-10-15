export function csvCell(value) {
  if (typeof value === "number" && Number.isFinite(value)) return `"${value}"`;
  let text = String(value ?? "");
  // Spreadsheet readers may ignore leading controls/whitespace before a formula prefix.
  // eslint-disable-next-line no-control-regex
  // Spreadsheet readers may ignore leading controls/whitespace before a formula prefix.
  // eslint-disable-next-line no-control-regex
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
