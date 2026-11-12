// Characters allowed in a phone number field: digits, spaces,
// hyphens, parentheses and the international prefix "+".
export function sanitizePhone(value: string): string {
  return value.replace(/[^\d\s().+-]/g, '')
}
