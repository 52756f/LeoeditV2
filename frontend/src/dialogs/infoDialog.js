// infoDialog.js

// Einfache Verwendung
// infoDialog.show('Information', 'Dies ist eine Info-Nachricht');

// // Mit benutzerdefiniertem Button-Text
// infoDialog.show('Erfolg', 'Die Aktion wurde erfolgreich abgeschlossen', 'Verstanden');

// // Mit async/await
// async function showInfo() {
//     await infoDialog.show('Wichtiger Hinweis', 'Bitte beachten Sie diese Information');
//     console.log('Dialog wurde geschlossen');
// }

class InfoDialog {
    constructor() {
        this.dialogElement = null;
        this.overlayElement = null;
    }

    /**
     * Zeigt einen Info-Dialog an
     * @param {string} title - Dialog-Titel
     * @param {string} message - Dialog-Nachricht
     * @param {string} [buttonText='OK'] - Text des OK-Buttons
     * @returns {Promise<void>}
     */
    async show(title, message, buttonText = 'OK') {
        return new Promise((resolve) => {
            // Overlay erstellen
            this.overlayElement = document.createElement('div');
            this.overlayElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.2s;
            `;

            // Dialog erstellen
            this.dialogElement = document.createElement('div');
            this.dialogElement.style.cssText = `
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                padding: 24px;
                min-width: 300px;
                max-width: 500px;
                animation: slideIn 0.3s;
            `;

            // Dialog-Inhalt
            this.dialogElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="8"></line>
                    </svg>
                    <h3 style="margin: 0; font-size: 18px; color: #333;">${title}</h3>
                </div>
                <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">${message}</p>
                <button id="infoDialogButton" style="
                    width: 100%;
                    padding: 10px 20px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#1976D2'" 
                   onmouseout="this.style.background='#2196F3'">
                    ${buttonText}
                </button>
            `;

            // Animationen hinzufügen
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { 
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);

            // Elemente zum DOM hinzufügen
            this.overlayElement.appendChild(this.dialogElement);
            document.body.appendChild(this.overlayElement);

            // Button-Event
            const button = document.getElementById('infoDialogButton');
            button.onclick = () => {
                this.close();
                resolve();
            };

            // Overlay-Click zum Schließen
            this.overlayElement.onclick = (e) => {
                if (e.target === this.overlayElement) {
                    this.close();
                    resolve();
                }
            };

            // ESC-Taste zum Schließen
            this.escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    resolve();
                }
            };
            document.addEventListener('keydown', this.escapeHandler);
        });
    }

    /**
     * Schließt den Dialog
     */
    close() {
        if (this.dialogElement) {
            // Animation für sanften Übergang
            this.dialogElement.style.animation = 'slideOut 0.2s';
            this.overlayElement.style.animation = 'fadeOut 0.2s';
            
            setTimeout(() => {
                if (this.overlayElement && this.overlayElement.parentNode) {
                    this.overlayElement.parentNode.removeChild(this.overlayElement);
                }
                document.removeEventListener('keydown', this.escapeHandler);
            }, 200);
        }
    }
}

// Animationen für das Schließen
const closeStyle = document.createElement('style');
closeStyle.textContent = `
    @keyframes slideOut {
        from { 
            opacity: 1;
            transform: translateY(0);
        }
        to { 
            opacity: 0;
            transform: translateY(-20px);
        }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(closeStyle);

// Globale Instanz exportieren
export const infoDialog = new InfoDialog();