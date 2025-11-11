import { format } from 'date-fns';
import { fr, enUS, es, de } from 'date-fns/locale';

const locales = { fr, en: enUS, es, de };

export const formatDate = (date: Date | string, formatStr: string = 'PPP', locale: string = 'fr') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const localeObj = locales[locale as keyof typeof locales] || locales.fr;
  return format(dateObj, formatStr, { locale: localeObj });
};

export const formatDateTime = (date: Date | string, locale: string = 'fr') => {
  return formatDate(date, 'PPp', locale);
};

export const formatNumber = (value: number, locale: string = 'fr') => {
  return new Intl.NumberFormat(locale).format(value);
};

export const formatCurrency = (value: number, currency: string = 'EUR', locale: string = 'fr') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
};

export const formatWeight = (value: number, locale: string = 'fr') => {
  return `${formatNumber(value, locale)} kg`;
};
