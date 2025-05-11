import i18next from './i18n/config.js';

export function renderLanguageSwitcherWithHandler(onLanguageChange: (lang: string) => void): string {
  return `
    <div class="language-switcher">
      <select class="language-select" id="languageSelect">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="ja">日本語</option>
        <option value="fr">Français</option>
      </select>
    </div>
  `;
}

export function setupLanguageSwitcherWithHandler(onLanguageChange: (lang: string) => void): void {
  const languageSelect = document.getElementById("languageSelect") as HTMLSelectElement;
  if (languageSelect) {
    // Set initial value based on current language
    const currentLang = i18next.language;
    languageSelect.value = currentLang;

    languageSelect.addEventListener("change", async (e) => {
      const newLang = (e.target as HTMLSelectElement).value;
      try {
        await i18next.changeLanguage(newLang);
        onLanguageChange(newLang);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    });
  }
} 