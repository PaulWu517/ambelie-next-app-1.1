import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyState {
  displayCurrency: string;
  rates: Record<string, number>;
  isInitialized: boolean;
  setCurrency: (currency: string) => void;
  initCurrency: () => Promise<void>;
}

// Stripe converts with a slight markup fee, typically around 2-4% depending on the region.
// We use 1.0375 to estimate the final localized price closely matching Stripe's Adaptive Pricing.
const STRIPE_FEE_MULTIPLIER = 1.0375; 

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      displayCurrency: 'GBP', // Default base currency
      rates: {},
      isInitialized: false,

      setCurrency: (currency: string) => {
        set({ displayCurrency: currency.toUpperCase() });
      },

      initCurrency: async () => {
        if (get().isInitialized) return;

        try {
          // 1. Fetch latest exchange rates (Base: GBP)
          const ratesRes = await fetch('https://open.er-api.com/v6/latest/GBP');
          const ratesData = await ratesRes.json();
          const rates = ratesData.rates || {};

          // 2. Auto-detect user currency by IP if they haven't manually selected one yet
          let detectedCurrency = get().displayCurrency;
          
          try {
            const ipRes = await fetch('https://ipapi.co/currency/');
            const currencyCode = await ipRes.text();
            // Verify if it's a valid 3-letter code supported by our rates
            if (currencyCode && currencyCode.length === 3 && rates[currencyCode]) {
              detectedCurrency = currencyCode;
            }
          } catch (ipErr) {
            console.warn('IP currency detection failed, falling back to default', ipErr);
          }

          set({ 
            rates, 
            displayCurrency: detectedCurrency,
            isInitialized: true 
          });
        } catch (error) {
          console.error('Failed to initialize currency:', error);
          set({ isInitialized: true });
        }
      }
    }),
    {
      name: 'currency-storage',
      // Only persist the user's selected currency, so we don't store stale exchange rates
      partialize: (state) => ({ displayCurrency: state.displayCurrency }),
    }
  )
);

// Helper function to calculate the estimated price
export const getConvertedPrice = (basePrice: number, targetCurrency: string, rates: Record<string, number>, baseCurrency: string = 'GBP') => {
  if (targetCurrency === baseCurrency || !rates[targetCurrency] || !rates[baseCurrency]) {
    return null;
  }
  
  // 如果基础货币不是 GBP，需要先转换成 GBP，再转换成目标货币
  // rates 字典里的汇率都是以 GBP 为基准的 (1 GBP = X TargetCurrency)
  const baseRateToGBP = rates[baseCurrency];
  const targetRateToGBP = rates[targetCurrency];
  
  // (basePrice / baseRateToGBP) = price in GBP
  // then multiply by targetRateToGBP to get final currency
  const convertedPrice = (basePrice / baseRateToGBP) * targetRateToGBP;
  
  return convertedPrice * STRIPE_FEE_MULTIPLIER;
};

export const currencySymbolMap: Record<string, string> = { 
  CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$', AUD: 'A$', CAD: 'C$' 
};
