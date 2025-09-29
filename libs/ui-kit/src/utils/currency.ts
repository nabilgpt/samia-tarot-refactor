// Currency formatting utilities (Always-USD as per spec)

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale?: string
): string {
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback for unsupported locales
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatCurrencyWithFX(
  amountUSD: number,
  localCurrency: string,
  exchangeRate: number,
  locale?: string
): string {
  const usdFormatted = formatCurrency(amountUSD, 'USD', 'en-US')
  const localAmount = amountUSD * exchangeRate
  const localFormatted = formatCurrency(localAmount, localCurrency, locale)

  return `${usdFormatted} (≈${localFormatted})`
}

export function parseCurrency(value: string): number {
  // Remove currency symbols and parse
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

// Convert cents to dollars
export function centsToUSD(cents: number): number {
  return cents / 100
}

// Convert dollars to cents
export function usdToCents(usd: number): number {
  return Math.round(usd * 100)
}