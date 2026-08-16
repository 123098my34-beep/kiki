export class FxRatesService {
  // Base currency is USD
  private static rates: Record<string, number> = {
    USD: 1.0,
    EUR: 1.09, // 1 EUR = 1.09 USD
    GBP: 1.28, // 1 GBP = 1.28 USD
    CAD: 0.74,
    AUD: 0.66,
    JPY: 0.0068, // 1 JPY = 0.0068 USD
    INR: 0.012   // 1 INR = 0.012 USD
  };

  /**
   * Converts any store currency amount into the Agency Base Currency (default USD)
   */
  static convertToBase(amount: number, sourceCurrency: string, targetCurrency = 'USD'): number {
    const srcUpper = sourceCurrency.toUpperCase();
    const tgtUpper = targetCurrency.toUpperCase();

    const inUsd = amount * (this.rates[srcUpper] || 1.0);
    const inTarget = inUsd / (this.rates[tgtUpper] || 1.0);

    return Math.round(inTarget * 100) / 100;
  }

  /**
   * Returns current active FX rate matrix
   */
  static getRateMatrix() {
    return { ...this.rates, lastUpdated: new Date().toISOString() };
  }
}
