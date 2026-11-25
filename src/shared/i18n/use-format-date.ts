import { useMemo } from 'react';

import { useLanguage } from './use-language';

/** Formats an ISO date as a day, in the app's language. */
export function useFormatDate() {
  const language = useLanguage();

  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });

    return (isoDate: string) => formatter.format(new Date(isoDate));
  }, [language]);
}
