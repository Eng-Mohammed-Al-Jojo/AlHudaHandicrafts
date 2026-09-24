import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { DEFAULT_SITE_SETTINGS, type CurrencyCode, type SiteSettings } from '../types'

export type CurrencyInfo = {
  code: CurrencyCode
  symbol: string
  label: string
  shortLabel: string
  icon: string
}

export const CURRENCY_CONFIG: Record<CurrencyCode, CurrencyInfo> = {
  ILS: { code: 'ILS', symbol: '₪', label: 'شيكل (ILS)', shortLabel: 'شيكل', icon: '₪' },
  USD: { code: 'USD', symbol: '$', label: 'دولار أمريكي (USD)', shortLabel: 'دولار', icon: '$' },
  EUR: { code: 'EUR', symbol: '€', label: 'يورو أوروبي (EUR)', shortLabel: 'يورو', icon: '€' },
}

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  currentConfig: CurrencyInfo
  currencySymbol: string
  currencyName: string
  convertPrice: (ilsPrice: number, targetCurrency?: CurrencyCode) => number
  formatPrice: (ilsPrice: number, options?: { showCode?: boolean }) => string
  formatNumber: (ilsPrice: number, targetCurrency?: CurrencyCode) => number
  usdRate: number
  eurRate: number
  currentRate: number
  availableCurrencies: CurrencyInfo[]
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

interface Props {
  children: ReactNode
  settings: SiteSettings
}

export function CurrencyProvider({ children, settings }: Props) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('al_huda_currency') as CurrencyCode
      if (saved && (saved === 'ILS' || saved === 'USD' || saved === 'EUR')) {
        return saved
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'ILS'
  })

  function setCurrency(newCurrency: CurrencyCode) {
    setCurrencyState(newCurrency)
    try {
      localStorage.setItem('al_huda_currency', newCurrency)
    } catch {
      // Ignore localStorage errors
    }
  }

  const usdRate = Number(settings.usdRate) > 0 ? Number(settings.usdRate) : DEFAULT_SITE_SETTINGS.usdRate
  const eurRate = Number(settings.eurRate) > 0 ? Number(settings.eurRate) : DEFAULT_SITE_SETTINGS.eurRate

  function convertPrice(ilsPrice: number, targetCurrency: CurrencyCode = currency): number {
    const basePrice = Number.isFinite(ilsPrice) ? ilsPrice : 0
    if (targetCurrency === 'USD') {
      const converted = basePrice / usdRate
      return Math.round(converted * 100) / 100
    }
    if (targetCurrency === 'EUR') {
      const converted = basePrice / eurRate
      return Math.round(converted * 100) / 100
    }
    return basePrice
  }

  function formatNumber(ilsPrice: number, targetCurrency: CurrencyCode = currency): number {
    return convertPrice(ilsPrice, targetCurrency)
  }

  function formatPrice(ilsPrice: number, options: { showCode?: boolean } = {}): string {
    const amount = convertPrice(ilsPrice)
    const displayAmount = amount.toLocaleString('en-US', { minimumFractionDigits: currency === 'ILS' ? 0 : 2, maximumFractionDigits: 2 })
    if (currency === 'USD') {
      return `$${displayAmount}${options.showCode ? ' USD' : ''}`
    }
    if (currency === 'EUR') {
      return `€${displayAmount}${options.showCode ? ' EUR' : ''}`
    }
    return `${displayAmount} ₪${options.showCode ? ' ILS' : ''}`
  }

  const currentConfig = CURRENCY_CONFIG[currency]
  const currentRate = currency === 'USD' ? usdRate : currency === 'EUR' ? eurRate : 1
  const availableCurrencies = Object.values(CURRENCY_CONFIG)

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        currentConfig,
        currencySymbol: currentConfig.symbol,
        currencyName: currentConfig.shortLabel,
        convertPrice,
        formatPrice,
        formatNumber,
        usdRate,
        eurRate,
        currentRate,
        availableCurrencies,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext)
  if (!context) {
    // Fallback if rendered outside provider
    return {
      currency: 'ILS',
      setCurrency: () => {},
      currentConfig: CURRENCY_CONFIG.ILS,
      currencySymbol: CURRENCY_CONFIG.ILS.symbol,
      currencyName: CURRENCY_CONFIG.ILS.shortLabel,
      convertPrice: (p: number) => p,
      formatPrice: (p: number) => `${p} ₪`,
      formatNumber: (p: number) => p,
      usdRate: DEFAULT_SITE_SETTINGS.usdRate,
      eurRate: DEFAULT_SITE_SETTINGS.eurRate,
      currentRate: 1,
      availableCurrencies: Object.values(CURRENCY_CONFIG),
    }
  }
  return context
}
