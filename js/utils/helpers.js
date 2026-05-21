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
