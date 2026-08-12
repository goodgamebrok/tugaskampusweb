export function formatRupiah(value: string | number | null | undefined): string {
  const n =
    typeof value === "string"
      ? parseFloat(String(value).replace(/,/g, "")) || 0
      : Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
