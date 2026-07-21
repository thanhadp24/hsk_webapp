export function formatScore(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function formatScorePair(score: string | number, totalScore: string | number) {
  return `${formatScore(score)}/${formatScore(totalScore)}`;
}
