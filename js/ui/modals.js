import { translateUI } from '../utils/i18n.js';

let onModalCloseCallback = null;

export function openModal(modalId, callback = null) {
    document.getElementById(modalId).classList.remove('hidden');
    document.getElementById('modal-backdrop').classList.remove('hidden');
    translateUI();
    onModalCloseCallback = callback;
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }

    // Hide backdrop only if no other modals are visible
    const anyModalVisible = document.querySelector('.modal:not(.hidden)');
    if (!anyModalVisible) {
        document.getElementById('modal-backdrop').classList.add('hidden');
    }

    if (onModalCloseCallback) {
        onModalCloseCallback();
        onModalCloseCallback = null;
    }
}

export function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('modal-backdrop').classList.add('hidden');
    if (onModalCloseCallback) {
        onModalCloseCallback();
        onModalCloseCallback = null;
    }
}

export function setupModals() {
    document.getElementById('modal-backdrop').addEventListener('click', closeAllModals);
    document.querySelectorAll('.modal .close-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
}
