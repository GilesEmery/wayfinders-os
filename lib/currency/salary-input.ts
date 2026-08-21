export function parseSalaryCurrencyInput(text: string) {
  const normalized = text.replace(/[^0-9.,]/g, "");
  if (!normalized || normalized === "." || normalized === ",") return undefined;
  const separators = [...normalized].flatMap((character, index) => character === "." || character === "," ? [index] : []);
  const lastSeparator = separators.at(-1) ?? -1;
  const fractionLength = lastSeparator < 0 ? 0 : normalized.length - lastSeparator - 1;
  const lastSeparatorCharacter = normalized[lastSeparator];
  const precedingSeparatorsUseAnotherCharacter = separators
    .slice(0, -1)
    .every((index) => normalized[index] !== lastSeparatorCharacter);
  const decimalIndex = lastSeparator >= 0 && (
    fractionLength <= 2
    || lastSeparatorCharacter === "." && separators.length === 1
    || separators.length > 1 && precedingSeparatorsUseAnotherCharacter
  ) ? lastSeparator : -1;
  const whole = (decimalIndex < 0 ? normalized : normalized.slice(0, decimalIndex)).replace(/[^0-9]/g, "") || "0";
  const fraction = decimalIndex < 0 ? "" : normalized.slice(decimalIndex + 1).replace(/[^0-9]/g, "");
  const canonical = fraction ? `${whole}.${fraction}` : whole;
  const amount = Number(canonical);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

export function formatSalaryCurrencyInput(amount: number | undefined, currency: string, locale?: Intl.LocalesArgument) {
  if (amount === undefined) return "";
  try { return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`; }
}

export function salaryCaretAfterDigits(text: string, digitCount: number) {
  if (digitCount <= 0) return text.search(/[0-9]/) < 0 ? text.length : text.search(/[0-9]/);
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) if (/\d/.test(text[index]) && ++seen === digitCount) return index + 1;
  return text.length;
}

export function salaryFractionRange(text: string): [number, number] | undefined {
  const match = [...text.matchAll(/[.,](\d{2})(?!.*\d)/g)].at(-1);
  return match?.index === undefined ? undefined : [match.index + 1, match.index + 3];
}
