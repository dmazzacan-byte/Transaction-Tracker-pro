let translations = {};

async function setLanguage(lang = 'es') {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load language file: ${lang}`);
        }
        translations = await response.json();
        translatePage();
    } catch (error) {
        console.error(error);
        // Fallback to English if the desired language fails
        if (lang !== 'en') {
            await setLanguage('en');
        }
    }
}

function translatePage() {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const translation = translations[key];
        if (translation) {
            // Check for specific attributes to translate, like 'placeholder'
            if (element.hasAttribute('data-i18n-target')) {
                const targetAttr = element.getAttribute('data-i18n-target');
                element.setAttribute(targetAttr, translation);
            } else {
                element.textContent = translation;
            }
        }
    });
}

function t(key, replacements = {}) {
    let translation = translations[key] || key;
    for (const placeholder in replacements) {
        translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return translation;
}

export { setLanguage, t };
