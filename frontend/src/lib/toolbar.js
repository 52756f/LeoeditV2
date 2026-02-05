const iconData = {
    'exit-app':
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-logout"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></svg>',
    'new-file':
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-file-description"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 2l.117 .007a1 1 0 0 1 .876 .876l.007 .117v4l.005 .15a2 2 0 0 0 1.838 1.844l.157 .006h4l.117 .007a1 1 0 0 1 .876 .876l.007 .117v9a3 3 0 0 1 -2.824 2.995l-.176 .005h-10a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-14a3 3 0 0 1 2.824 -2.995l.176 -.005zm3 14h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0 -2m0 -4h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0 -2" /><path d="M19 7h-4l-.001 -4.001z" /></svg>',
    'open-file': `<svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27,9v5c0,0.55-0.45,1-1,1H6.74L2.96,27.29C2.83,27.72,2.43,28,2,28c-0.05,0-0.1,0-0.15-0.01C1.36,27.92,1,27.5,1,27V5c0-0.55,0.45-1,1-1h7c0.31,0,0.61,0.15,0.8,0.4L12.5,8H26C26.55,8,27,8.45,27,9z" fill="#FE9803"/>
    <line x1="26" y1="27" x2="2" y2="27" stroke="#231F20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M30.96,14.29l-4,13C26.83,27.71,26.44,28,26,28H2c-0.32,0-0.62-0.15-0.8-0.41c-0.19-0.25-0.25-0.58-0.16-0.88l4-13C5.17,13.29,5.56,13,6,13h24c0.32,0,0.62,0.15,0.8,0.41C30.99,13.66,31.05,13.99,30.96,14.29z" fill="#FFC10A"/>
    </svg>`,
    cut: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-scissors"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 7a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M8.6 8.6l10.4 10.4" /><path d="M8.6 15.4l10.4 -10.4" /></svg>',
    'close-app': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#FF0000"/>
    <line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    paste: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Clipboard top -->
    <rect x="9" y="3" width="6" height="4" rx="2"/>
    <!-- Clipboard body -->
    <rect x="6" y="6" width="12" height="15" rx="2"/>
    <!-- Paper lines -->
    <path d="M9 11h6"/>
    <path d="M9 15h6"/>
    </svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Back page -->
    <rect x="5" y="5" width="12" height="14" rx="2"/>
    <!-- Front page -->
    <rect x="9" y="3" width="12" height="14" rx="2"/>
    </svg>`,
};

export class Toolbar {
    constructor(container, handlers = {}) {
        this.container = container;
        this.handlers = handlers;
        this.setupEventListeners();
        this.initToolbarIcons();
    }

    setupEventListeners() {
        Object.entries(this.handlers).forEach(([buttonId, handler]) => {
            const button = this.container.querySelector(`#${buttonId}`);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handler();
                });
            }
        });
    }

    setButtonEnabled(buttonId, enabled) {
        const button = this.container.querySelector(`#${buttonId}`);
        if (button) {
            button.disabled = !enabled;
        }
    }

    destroy() {
        this.container.innerHTML = '';
    }

    initToolbarIcons() {
        console.log('Initializing toolbar icons');

        const toolbarButtons = document.querySelectorAll('.toolbar-btn');

        toolbarButtons.forEach((button) => {
            const buttonId = button.id;
            const spanElement = button.querySelector('span.icon');

            if (spanElement && iconData[buttonId]) {
                spanElement.innerHTML = iconData[buttonId];
            }
        });
    }
}
