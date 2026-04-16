export class Format {
  static price(amount: number, showCurrency = true): string {
    const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return showCurrency ? `${formatted} FCFA` : formatted;
  }
}
