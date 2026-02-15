// terminalpanel.js - xterm.js-basiertes Terminal-Panel
// Wrapper-Klasse für xterm.js mit Wails-Backend-Integration.
// Jedes Panel hat seine eigene PTY-Session im Go-Backend.
import { EventsOn, EventsOff } from "../wailsjs/runtime/runtime.js";
import { StartTerminal, WriteTerminal, ResizeTerminal, StopTerminal } from '../wailsjs/go/main/App.js';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

export class TerminalPanel {
    constructor(tabId, options) {
        this.tabId = tabId;
        this.options = options;
        this.terminal = null;
        this.fitAddon = null;
        this.panel = null;
        this.resizeObserver = null;
        this.isDestroyed = false;

        // Bound event handlers for cleanup
        this.boundOnOutput = this.onTerminalOutput.bind(this);
        this.boundOnExit = this.onTerminalExit.bind(this);

        this.init();
    }

    async init() {
        this.createPanel();
        this.setupTerminal();
        this.registerEvents();
        await this.startSession();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = `terminal-panel-${this.tabId}`;
        this.panel.className = 'terminal-panel';
        this.panel.style.cssText = `
            width: 100%;
            height: 100%;
            background: #1e1e1e;
            padding: 4px;
            box-sizing: border-box;
        `;
        this.options.dom.appendChild(this.panel);
    }

    setupTerminal() {
        this.terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: '"Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace',
            lineHeight: 1.2,
            scrollback: 10000,
            theme: {
                background: '#1e1e1e',
                foreground: '#cccccc',
                cursor: '#ffffff',
                cursorAccent: '#1e1e1e',
                selectionBackground: '#264f78',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#ffffff'
            }
        });

        // FitAddon zum automatischen Anpassen der Terminal-Groesse
        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);

        // WebLinksAddon fuer klickbare URLs
        this.terminal.loadAddon(new WebLinksAddon());

        // Terminal in DOM einfuegen
        this.terminal.open(this.panel);

        // Initiale Groessenanpassung
        setTimeout(() => {
            this.fitAddon.fit();
        }, 0);

        // User-Eingabe an Backend senden
        this.terminal.onData(data => {
            if (!this.isDestroyed) {
                WriteTerminal(this.tabId, data).catch(err => {
                    console.error('WriteTerminal error:', err);
                });
            }
        });

        // Kontextmenü für Rechtsklick (auf xterm-Element, nicht Panel)
        this.contextMenu = null;
        this.terminal.element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e.clientX, e.clientY);
        });
        this._boundClickHandler = () => this.hideContextMenu();
        this._boundKeyHandler = (e) => { if (e.key === 'Escape') this.hideContextMenu(); };
        document.addEventListener('click', this._boundClickHandler);
        document.addEventListener('keydown', this._boundKeyHandler);

        // Resize-Handling einrichten
        this.setupResizeHandling();
    }

    setupResizeHandling() {
        this.resizeObserver = new ResizeObserver(() => {
            if (this.isDestroyed || !this.fitAddon) return;

            this.fitAddon.fit();
            const dims = this.fitAddon.proposeDimensions();
            if (dims && dims.cols && dims.rows) {
                ResizeTerminal(this.tabId, dims.cols, dims.rows).catch(err => {
                    // Ignorieren wenn Session bereits beendet
                    if (!this.isDestroyed) {
                        console.error('ResizeTerminal error:', err);
                    }
                });
            }
        });
        this.resizeObserver.observe(this.panel);
    }

    registerEvents() {
        EventsOn(`terminal_output_${this.tabId}`, this.boundOnOutput);
        EventsOn(`terminal_exit_${this.tabId}`, this.boundOnExit);
    }

    unregisterEvents() {
        EventsOff(`terminal_output_${this.tabId}`);
        EventsOff(`terminal_exit_${this.tabId}`);
    }

    onTerminalOutput(data) {
        if (data && this.terminal && !this.isDestroyed) {
            this.terminal.write(data);
        }
    }

    onTerminalExit(data) {
        if (this.terminal && !this.isDestroyed) {
            const exitCode = data?.exitCode ?? 0;
            this.terminal.write(`\r\n\x1b[90m[Prozess beendet mit Code ${exitCode}]\x1b[0m\r\n`);
        }
    }

    async startSession() {
        try {
            await StartTerminal(this.tabId);

            // Initiale Groesse nach Start senden
            setTimeout(() => {
                if (this.isDestroyed) return;
                const dims = this.fitAddon.proposeDimensions();
                if (dims && dims.cols && dims.rows) {
                    ResizeTerminal(this.tabId, dims.cols, dims.rows).catch(() => {});
                }
            }, 100);
        } catch (error) {
            console.error('Failed to start terminal:', error);
            if (this.terminal) {
                this.terminal.write(`\r\n\x1b[31mFehler beim Starten des Terminals: ${error}\x1b[0m\r\n`);
            }
        }
    }

    showContextMenu(x, y) {
        this.hideContextMenu();

        const selection = this.terminal.getSelection();

        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'terminal-context-menu';
        this.contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: #252526;
            border: 1px solid #454545;
            border-radius: 4px;
            padding: 4px 0;
            min-width: 160px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
        `;

        const menuItems = [
            { label: 'Kopieren', icon: '📋', action: 'copy', shortcut: 'Ctrl+Shift+C', disabled: !selection },
            { label: 'Einfügen', icon: '📄', action: 'paste', shortcut: 'Ctrl+Shift+V' },
            { type: 'separator' },
            { label: 'Alles auswählen', action: 'selectAll', shortcut: 'Ctrl+Shift+A' },
            { label: 'Auswahl löschen', action: 'clearSelection', disabled: !selection },
            { type: 'separator' },
            { label: 'Terminal löschen', action: 'clear' },
        ];

        menuItems.forEach(item => {
            if (item.type === 'separator') {
                const sep = document.createElement('div');
                sep.style.cssText = 'height: 1px; background: #454545; margin: 4px 0;';
                this.contextMenu.appendChild(sep);
                return;
            }

            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 6px 12px;
                cursor: ${item.disabled ? 'default' : 'pointer'};
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: ${item.disabled ? '#6e6e6e' : '#cccccc'};
            `;

            const leftPart = document.createElement('span');
            leftPart.textContent = (item.icon ? item.icon + ' ' : '') + item.label;

            const shortcut = document.createElement('span');
            shortcut.style.cssText = 'color: #6e6e6e; font-size: 11px; margin-left: 20px;';
            shortcut.textContent = item.shortcut || '';

            menuItem.appendChild(leftPart);
            menuItem.appendChild(shortcut);

            if (!item.disabled) {
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.background = '#094771';
                });
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.background = 'transparent';
                });
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.hideContextMenu();
                    this.executeContextAction(item.action);
                });
            }

            this.contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(this.contextMenu);

        // Position anpassen wenn außerhalb des Viewports
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }

    hideContextMenu() {
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
        this.contextMenu = null;
    }

    executeContextAction(action) {
        switch (action) {
            case 'copy':
                const text = this.terminal.getSelection();
                if (text && window.runtime?.ClipboardSetText) {
                    window.runtime.ClipboardSetText(text).catch(err => {
                        console.error('Terminal clipboard copy failed:', err);
                    });
                }
                break;
            case 'paste':
                if (window.runtime?.ClipboardGetText) {
                    window.runtime.ClipboardGetText().then(text => {
                        if (text && !this.isDestroyed) {
                            WriteTerminal(this.tabId, text).catch(err => {
                                console.error('Paste to terminal error:', err);
                            });
                        }
                    }).catch(err => {
                        console.error('Terminal clipboard paste failed:', err);
                    });
                }
                break;
            case 'selectAll':
                this.terminal.selectAll();
                break;
            case 'clearSelection':
                this.terminal.clearSelection();
                break;
            case 'clear':
                this.terminal.clear();
                break;
        }
        this.terminal.focus();
    }

    focus() {
        if (this.terminal && !this.isDestroyed) {
            this.terminal.focus();
        }
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        // Events entfernen
        this.unregisterEvents();
        this.hideContextMenu();
        document.removeEventListener('click', this._boundClickHandler);
        document.removeEventListener('keydown', this._boundKeyHandler);

        // Backend-Session beenden
        StopTerminal(this.tabId).catch(err => {
            console.error('Failed to stop terminal:', err);
        });

        // ResizeObserver entfernen
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // xterm.js aufraumen
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }

        // DOM entfernen
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        this.panel = null;
    }
}
