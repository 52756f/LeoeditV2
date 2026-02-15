// Alle Icons: Tabler Icons, 18x18, outline-Stil, stroke="currentColor"
const svg = (d) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/>${d}</svg>`;

const iconData = {
    // Power off
    'close-app': svg('<path d="M7 6a7.75 7.75 0 1 0 10 0" /><path d="M12 2v6" />'),
    // Datei mit Plus
    'new-file': svg('<path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M12 11v6" /><path d="M9 14h6" />'),
    // Ordner öffnen
    'open-file': svg('<path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a1 1 0 0 1 -.986 .825h-14.004a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />'),
    // Diskette
    'save-file': svg('<path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2" /><path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M14 4v4h-6v-4" />'),
    // Pfeil zurück
    'undo': svg('<path d="M9 14l-4 -4l4 -4" /><path d="M5 10h11a4 4 0 1 1 0 8h-1" />'),
    // Pfeil vor
    'redo': svg('<path d="M15 14l4 -4l-4 -4" /><path d="M19 10h-11a4 4 0 0 0 0 8h1" />'),
    // Schere
    'cut': svg('<path d="M6 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M6 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M8.6 8.6l10.4 10.4" /><path d="M8.6 15.4l10.4 -10.4" />'),
    // Zwei Dokumente versetzt
    'copy': svg('<path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" />'),
    // Clipboard mit Arrow-Down
    'paste': svg('<path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M12 12v6" /><path d="M9 15l3 3l3 -3" />'),
    // Zahnrad
    'settings': svg('<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.066 2.573c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.573 1.066c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.066 -2.573c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />'),
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
