# Internationalization (i18n) Guide

This project uses `react-i18next` for multi-language support.

## Current Languages

- 🇫🇷 French (fr) - Default
- 🇬🇧 English (en)

## How to Use Translations

### In React Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('messages.title')}</p>
    </div>
  );
}
```

### With Variables

```tsx
// In translation file:
{
  "welcome": "Welcome {{name}}"
}

// In component:
{t('welcome', { name: 'John' })}
```

### With Pluralization

```tsx
// In translation file:
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}

// In component:
{t('items', { count: 5 })}
```

## Adding a New Language

### 1. Create Translation File

Create a new JSON file in `src/i18n/locales/`:

```bash
src/i18n/locales/es.json  # For Spanish
src/i18n/locales/de.json  # For German
```

### 2. Add Translations

Copy the structure from `en.json` or `fr.json` and translate all keys:

```json
{
  "common": {
    "loading": "Cargando...",
    "error": "Error",
    ...
  },
  ...
}
```

### 3. Update i18n Config

Edit `src/i18n/config.ts`:

```ts
import esTranslations from './locales/es.json';

export const resources = {
  en: { translation: enTranslations },
  fr: { translation: frTranslations },
  es: { translation: esTranslations }, // Add new language
} as const;
```

### 4. Update Language Switcher

Edit `src/components/LanguageSwitcher.tsx`:

```ts
const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }, // Add new language
];
```

## Translation Key Structure

```
common.*          - Shared UI elements (buttons, labels)
nav.*            - Navigation menu items
auth.*           - Authentication pages
messages.*       - Messaging feature
tracking.*       - Tracking and GPS features
shipments.*      - Shipment management
trips.*          - Trip management
profile.*        - User profile
notifications.*  - Notifications
settings.*       - Settings page
```

## Best Practices

1. **Use namespaces**: Group related translations together
2. **Keep keys descriptive**: Use `shipments.createFirst` not `btn1`
3. **Avoid hardcoded text**: Always use translation keys
4. **Test all languages**: Ensure UI looks good in all supported languages
5. **Handle long text**: Consider text length differences between languages
6. **Use variables**: For dynamic content like names, dates, numbers

## Language Detection

The app automatically detects the user's preferred language from:
1. LocalStorage (if previously set)
2. Browser language settings
3. Falls back to French (default)

## Changing Language Programmatically

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { i18n } = useTranslation();
  
  const changeToEnglish = () => {
    i18n.changeLanguage('en');
  };
  
  return <button onClick={changeToEnglish}>English</button>;
}
```

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
