import { useMemo } from 'react';

import { useLanguage } from './use-language';

/** Dates and amounts formatted in the app's language. */
export function useFormatters() {
  const language = useLanguage();

  return useMemo(() => {
    const day = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });
    const dayAndTime = new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return {
      date: (isoDate: string) => day.format(new Date(isoDate)),
      dateTime: (isoDate: string) => dayAndTime.format(new Date(isoDate)),
      money: (amount: number, currency: string) =>
        new Intl.NumberFormat(language, { style: 'currency', currency }).format(amount),
    };
  }, [language]);
}
