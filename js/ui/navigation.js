export function setupNavigation(dashboardCallback) {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabs = document.querySelectorAll('.tab-content');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.dataset.tab;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabs.forEach(t => t.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'dashboard') {
                dashboardCallback();
            }

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }
        });
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });
}
