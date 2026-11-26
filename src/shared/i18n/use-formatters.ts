import { useMemo } from 'react';

import { useLanguage } from './use-language';

/** Dates, amounts and countries in the app's language. */
export function useFormatters() {
  const language = useLanguage();

  return useMemo(() => {
    const day = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });
    const dayAndTime = new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const region = new Intl.DisplayNames(language, { type: 'region' });

    return {
      date: (isoDate: string) => day.format(new Date(isoDate)),
      dateTime: (isoDate: string) => dayAndTime.format(new Date(isoDate)),
      /** A country's name from its ISO code (`FR` → "France"), or the code if it has none. */
      country: (countryCode: string) => region.of(countryCode) ?? countryCode,
      money: (amount: number, currency: string) =>
        new Intl.NumberFormat(language, { style: 'currency', currency }).format(amount),
    };
  }, [language]);
}
