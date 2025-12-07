
let translations = {};

function translateUI() {
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.dataset.i18nKey;
        const translation = t(key);
        const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNode) {
            textNode.textContent = translation;
        } else if (el.firstChild && el.firstChild.nodeType !== Node.ELEMENT_NODE) {
            el.textContent = translation;
        } else if (!el.children.length) {
            el.textContent = translation;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        el.placeholder = t(key);
    });
}

export async function setLanguage(lang = 'es') {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();
        translateUI();
    } catch (error) {
        console.error("Could not load language file:", error);
        if (lang !== 'en') {
            await setLanguage('en');
        }
    }
}

export function t(key, options = {}) {
    let translation = translations[key] || key;
    Object.keys(options).forEach(placeholder => {
        const regex = new RegExp(`{{${placeholder}}}`, 'g');
        translation = translation.replace(regex, options[placeholder]);
    });
    return translation;
}

export function populateSelect(selectId, data, valueKey, textKey, selectedValue) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select...</option>';
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        if (item[valueKey] === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

export function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

export function formatCurrency(amount) {
    return `$${(amount || 0).toFixed(2)}`;
}
