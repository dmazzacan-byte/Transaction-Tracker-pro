
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
            container.removeChild(toast);
        }, 300);
    }, 3000);
}
