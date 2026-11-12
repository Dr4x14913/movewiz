# Project Design System Guidelines

This document outlines the visual standards for the project. Please adhere to these rules to ensure consistency across all UI components.

## 1. Color Palette

Use the following hex codes for all styling. Do not create new custom colors unless explicitly approved.

**Backgrounds & Surfaces**
*   **Background Cream**: `#FDFCF5`
    *   *Usage*: Main application background. Provides a warm, inviting feel compared to pure white.

**Primary Accents (Mascot & Interactive Elements)**
*   **Primary Green**: `#8BC34A`
    *   *Usage*: Mascot body, primary call-to-action buttons, and key highlights.
    *   *Vibe*: Vibrant, energetic, lime/leaf green.
*   **Secondary Green (Outlines)**: `#2E7D32`
    *   *Usage*: Outlines for the mascot and decorative borders.
    *   *Vibe*: Forest green; provides definition and a hand-drawn aesthetic.

**Branding & Logo**
*   **Primary Orange**: `#D86C1F`
    *   *Usage*: Logo text and specific branding elements.
    *   *Note*: This is a warm terracotta/burnt orange, deeper than standard orange.

**Typography Colors**
*   **Text Dark Grey**: `#333333`
    *   *Usage*: Main headings, strong emphasis text. (Avoid pure black `#000000`).
*   **Text Medium Grey**: `#666666`
    *   *Usage*: Secondary text, navigation items, captions.

## 2. Typography

Import the following fonts from Google Fonts.

**Headings & Logo**
*   **Font Family**: `Nunito` OR `Quicksand`
*   **Style**: Rounded sans-serif.
*   **Usage**: All headings (H1–H6), logo text, and large display text.

**Body Text**
*   **Font Family**: `Open Sans` OR `Lato`
*   **Style**: Clean, readable sans-serif.
*   **Usage**: Paragraphs, articles, form labels, and general content.

## 3. UI Component Styles

### Buttons
All primary action buttons must follow this specification:

*   **Shape**: Fully rounded corners (Pill shape).
    *   CSS: `border-radius: 50px;` (or sufficient radius to fully round).
*   **Default State**:
    *   Background: Primary Green (`#8BC34A`)
    *   Text Color: White (`#FFFFFF`)
*   **Hover State**:
    *   Option A: Change background to slightly darker green (`#7CB342`).
    *   Option B: Add a subtle box-shadow for elevation.
*   **Text Style**: Use Headings Font (Nunito/Quicksand) for better alignment with brand vibe.

## 4. Implementation Notes

1.  **CSS Variables**: Define these colors as CSS custom properties (`:root`) for easy maintenance:
    ```css
    :root {
      --color-bg-cream: #FDFCF5;
      --color-primary-green: #8BC34A;
      --color-secondary-green: #2E7D32;
      --color-primary-orange: #D86C1F;
      --color-text-dark: #333333;
      --color-text-medium: #666666;
      --font-heading: 'Nunito', sans-serif; /* or Quicksand */
      --font-body: 'Open Sans', sans-serif; /* or Lato */
    }
    ```
2.  **Accessibility**: Ensure sufficient contrast between text and background colors, especially when using the Primary Green button with white text.
3.  **Consistency**: Always use the specified grey tones for text instead of black to maintain the soft, friendly aesthetic.


## 5. Internationalization (i18n)

The project uses `vue-i18n` for multi-language support. All user-facing text must be translated.

### Supported Languages
*   **English (en)** — Default fallback
*   **French (fr)**

### Translation Files
Located in `src/i18n/locales/`:
*   `en.ts` — English translations
*   `fr.ts` — French translations

### Rules

1.  **Never hardcode user-facing text**. Always use translation keys:
    ```vue
    <!-- Wrong -->
    <button>Submit</button>

    <!-- Correct -->
    <button>{{ $t('createEvent.submit') }}</button>
    ```

2.  **Key naming convention**: Use dot notation grouped by page/section.
    ```
    nav.home
    hero.tagline
    createEvent.contact.firstName
    eventPage.fields.date
    ```

3.  **Adding new text**: Add the key to both locale files (`en.ts` and `fr.ts`) simultaneously. Do not commit with missing translations. Before adding check for already defined translation to avoid duplicates.

4.  **Dynamic content** (data from APIs, user input) should not be translated. Only static UI text.

5.  **Date/number formatting**: Use `Intl` or locale-aware formatters. The `formatDate()` in `EventPage.vue` is an example:
    ```ts
    const dsLocale = locale.value === 'fr' ? 'fr-FR' : 'en-US'
    new Date(dateStr).toLocaleDateString(dsLocale, { ... })
    ```

6.  **Accessing locale in script**: Use `useI18n()` composable:
    ```ts
    import { useI18n } from 'vue-i18n'
    const { locale } = useI18n()
    ```

### IMPORTANT NOTE
The according css is already written at ./assets/
