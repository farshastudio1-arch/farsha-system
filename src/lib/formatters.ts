export function formatRupiah(amount: number) {
  const finiteAmount = Number.isFinite(amount) ? amount : 0;
  const sign = finiteAmount < 0 ? '-' : '';
  const absoluteAmount = Math.round(Math.abs(finiteAmount));
  const formattedAmount = absoluteAmount
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${sign}Rp ${formattedAmount}`;
}
