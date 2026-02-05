export function showKeyboardShortcutsDialog() {
    // Keyboard shortcuts data
    const shortcuts = [
        { category: 'Datei', items: [
            { keys: 'Strg + N', action: 'Neue Datei' },
            { keys: 'Strg + O', action: 'Datei öffnen' },
            { keys: 'Strg + S', action: 'Speichern' },
            { keys: 'Strg + Shift + S', action: 'Speichern unter' },
            { keys: 'Strg + W', action: 'Tab schließen' },
            { keys: 'Strg + Q', action: 'Beenden' },
        ]},
        { category: 'Bearbeiten', items: [
            { keys: 'Strg + Z', action: 'Rückgängig' },
            { keys: 'Strg + Y', action: 'Wiederholen' },
            { keys: 'Strg + X', action: 'Ausschneiden' },
            { keys: 'Strg + C', action: 'Kopieren' },
            { keys: 'Strg + V', action: 'Einfügen' },
            { keys: 'Strg + A', action: 'Alles auswählen' },
            { keys: 'Strg + Shift + F', action: 'Code formatieren' },
        ]},
        { category: 'Suchen', items: [
            { keys: 'Strg + F', action: 'Suchen' },
            { keys: 'Strg + H', action: 'Suchen & Ersetzen' },
            { keys: 'F3', action: 'Weitersuchen' },
            { keys: 'Shift + F3', action: 'Rückwärts suchen' },
        ]},
        { category: 'Editor', items: [
            { keys: 'Tab', action: 'Einrücken' },
            { keys: 'Shift + Tab', action: 'Ausrücken' },
            { keys: 'Strg + /', action: 'Zeile kommentieren' },
            { keys: 'Strg + D', action: 'Zeile duplizieren' },
            { keys: 'Alt + ↑', action: 'Zeile nach oben' },
            { keys: 'Alt + ↓', action: 'Zeile nach unten' },
        ]},
        { category: 'Code-Faltung', items: [
            { keys: 'Strg + Shift + [', action: 'Block einklappen' },
            { keys: 'Strg + Shift + ]', action: 'Block ausklappen' },
        ]},
    ];

    // Generate shortcuts HTML
    const shortcutsHtml = shortcuts.map(cat => `
        <div class="shortcut-category">
            <h3>${cat.category}</h3>
            <div class="shortcut-list">
                ${cat.items.map(item => `
                    <div class="shortcut-item">
                        <span class="shortcut-keys">${item.keys}</span>
                        <span class="shortcut-action">${item.action}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
        <div class="shortcuts-content">
            <div class="shortcuts-header">
                <h2>Tastenkürzel</h2>
                <button class="close-btn">&times;</button>
            </div>
            <div class="shortcuts-body">
                ${shortcutsHtml}
            </div>
        </div>
    `;

    // Add styles if not already present
    if (!document.getElementById('shortcuts-dialog-styles')) {
        const style = document.createElement('style');
        style.id = 'shortcuts-dialog-styles';
        style.textContent = `
            .shortcuts-modal {
                display: flex;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }

            .shortcuts-content {
                background: #1e1e1e;
                color: #cccccc;
                padding: 0;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                min-width: 500px;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .shortcuts-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: #333333;
                border-bottom: 1px solid #3e3e42;
            }

            .shortcuts-header h2 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
            }

            .shortcuts-modal .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #888;
                padding: 0;
                width: 30px;
                height: 30px;
                line-height: 1;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .shortcuts-modal .close-btn:hover {
                background: #dc3545;
                color: white;
            }

            .shortcuts-body {
                padding: 16px 20px;
                overflow-y: auto;
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
            }

            .shortcut-category {
                background: #252526;
                border-radius: 6px;
                padding: 12px;
            }

            .shortcut-category h3 {
                margin: 0 0 10px 0;
                font-size: 13px;
                font-weight: 600;
                color: #3794ff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .shortcut-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid #3e3e42;
            }

            .shortcut-item:last-child {
                border-bottom: none;
            }

            .shortcut-keys {
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 12px;
                background: #0e639c;
                color: white;
                padding: 3px 8px;
                border-radius: 4px;
                white-space: nowrap;
            }

            .shortcut-action {
                font-size: 13px;
                color: #cccccc;
                text-align: right;
            }

            @media (max-width: 600px) {
                .shortcuts-body {
                    grid-template-columns: 1fr;
                }

                .shortcuts-content {
                    min-width: 90vw;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Add to document
    document.body.appendChild(modal);

    // Close button handler
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    });
}
