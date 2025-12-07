export function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error('Notification container not found!');
        return;
    }

    const notification = document.createElement('div');
    notification.className = `toast ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Trigger the animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Remove the notification after a few seconds
    setTimeout(() => {
        notification.classList.remove('show');
        // Remove the element from the DOM after the fade out animation
        setTimeout(() => {
            if (notification.parentNode === container) {
                 container.removeChild(notification);
            }
        }, 500);
    }, 3000);
}
