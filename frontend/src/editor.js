// editor.js — CodeMirror 6 Wrapper.
// Kapselt eine CodeMirror-EditorView-Instanz und bietet eine vereinfachte
// Schnittstelle für die TabView (Inhalt setzen, Sprache wechseln, Befehle).
//
// CodeMirror 6 ist modular aufgebaut:
//   - basicSetup: Standard-Features (Zeilennummern, Einrückung, Klammern, etc.)
//   - Sprach-Plugins: Syntax-Highlighting und Autovervollständigung pro Sprache
//   - oneDark: Farbschema (dunkles Theme)
//   - Extensions: Zusätzliche Features (Suche, Klammer-Matching, etc.)
import { EditorView, basicSetup } from 'codemirror';
import {EditorState} from "@codemirror/state"
import {drawSelection} from "@codemirror/view"
import {
    indentOnInput,
    bracketMatching,
    indentUnit,
    HighlightStyle,
    syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { undo as cmUndo, redo as cmRedo, selectAll as cmSelectAll, indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { search, openSearchPanel, gotoLine } from '@codemirror/search';

// Custom syntax highlighting - softer colors with green comments
const customHighlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: "#369c09" },           // Green comments
    { tag: tags.lineComment, color: "#6a9955" },
    { tag: tags.blockComment, color: "#6a9955" },
    { tag: tags.docComment, color: "#6a9955" },
    { tag: tags.keyword, color: "#c586c0" },           // Softer purple for keywords
    { tag: tags.controlKeyword, color: "#c586c0" },
    { tag: tags.operatorKeyword, color: "#c586c0" },
    { tag: tags.definitionKeyword, color: "#c586c0" },
    { tag: tags.string, color: "#ce9178" },            // Soft orange for strings
    { tag: tags.number, color: "#b5cea8" },            // Soft green for numbers
    { tag: tags.bool, color: "#569cd6" },              // Blue for booleans
    { tag: tags.null, color: "#569cd6" },
    { tag: tags.function(tags.variableName), color: "#dcdcaa" }, // Soft yellow for functions
    { tag: tags.definition(tags.variableName), color: "#9cdcfe" }, // Light blue for definitions
    { tag: tags.variableName, color: "#9cdcfe" },
    { tag: tags.propertyName, color: "#9cdcfe" },
    { tag: tags.className, color: "#4ec9b0" },         // Teal for classes
    { tag: tags.typeName, color: "#4ec9b0" },
    { tag: tags.tagName, color: "#569cd6" },           // Blue for HTML tags
    { tag: tags.attributeName, color: "#9cdcfe" },
    { tag: tags.operator, color: "#d4d4d4" },          // Light gray for operators
    { tag: tags.punctuation, color: "#d4d4d4" },
]);

// fileDragExtension: Verhindert, dass CodeMirror Dateien als Text einfügt.
// Stattdessen wird das Drag-Event an das Fenster weitergeleitet, wo es
// vom Go-Backend (OnFileDrop) verarbeitet wird.
const fileDragExtension = EditorView.domEventHandlers({
    dragover(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        return true;
    },
    drop(event) {
        event.preventDefault();
        return true;
    }
});

export class CodeEditor {
    // container: DOM-Element, in das der Editor gerendert wird
    // tab: Tab-Objekt mit Inhalt, Typ und Metadaten
    // onContentChange: Callback → wird bei jeder Textänderung aufgerufen
    constructor(container, tab, onContentChange, onCursorChange, onAskAI) {
        this.container = container;
        this.tab = tab;
        this.onContentChange = onContentChange;
        this.onCursorChange = onCursorChange;
        this.onAskAI = onAskAI;  // Callback für "Ask AI" Kontextmenü
        this.view = null;
        this.contextMenu = null;
        // Event-Listener-Referenzen für Cleanup in destroy()
        this._boundClickHandler = null;
        this._boundKeyHandler = null;
        this.initialize();
    }

    // getLanguageExtension gibt die passende CodeMirror-Spracherweiterung zurück.
    // WICHTIG: Muss mit getFileType() in utils.js synchron sein!
    // Unbekannte Typen → kein Sprach-Plugin (Plaintext) statt falschem Highlighting.
    getLanguageExtension(type) {
        const languages = {
            'javascript': javascript(),
            'html': html(),
            'css': css(),
            'json': json(),
            'python': python(),
            'go': go(),
            'java': java(),
            'cpp': cpp(),
            'c': cpp(),  // C verwendet C++ Highlighting
            'markdown': markdown()
        };
        // Für unbekannte Typen: Plaintext (kein Syntax-Highlighting)
        // Besser als falsches JavaScript-Highlighting für Rust, Kotlin, etc.
        if (type === 'text' || !languages[type]) return [];
        return languages[type];
    }

    // initialize erstellt die CodeMirror-EditorView mit allen Extensions.
    // Die Extensions werden als Array übergeben und bestimmen das gesamte
    // Verhalten des Editors (Aussehen, Sprache, Tastenkürzel, Events).
    initialize() {
        this.container.innerHTML = '';

        // Kontextmenü-Extension für Rechtsklick
        const contextMenuExtension = EditorView.domEventHandlers({
            contextmenu: (event) => {
                event.preventDefault();
                this.showContextMenu(event.clientX, event.clientY);
                return true;
            }
        });

        this.view = new EditorView({
            doc: this.tab.content,       // Initialer Textinhalt
            extensions: [
                basicSetup,              // Standard-Features (Zeilennummern, etc.)
                keymap.of([indentWithTab]), // Tab/Shift-Tab für Einrückung
                drawSelection(),         // Zeichnet Cursor/Selektionen für Multi-Cursor
                EditorState.allowMultipleSelections.of(true), // Mehrere Cursor erlauben
                fileDragExtension,       // Verhindert Drag-Drop-Texteinfügung
                contextMenuExtension,    // Kontextmenü für "Ask AI"
                search({ top: true }),   // Suchleiste oben statt unten
                indentOnInput(),         // Auto-Einrückung beim Tippen
                bracketMatching(),       // Klammer-Matching-Hervorhebung
                indentUnit.of("    "),   // 4 Leerzeichen pro Einrückungsebene
                this.getLanguageExtension(this.tab.type), // Sprach-Plugin
                oneDark,                 // Dunkles Farbschema (inkl. Syntax-Farben)
                syntaxHighlighting(customHighlightStyle), // Custom: green comments, softer colors
                // Change-Listener: Wird bei jeder Textänderung ausgelöst.
                // Aktualisiert das Tab-Datenmodell und benachrichtigt TabView.
                EditorView.updateListener.of(update => {
                    if (update.docChanged) {
                        const newContent = this.view.state.doc.toString();
                        if (newContent !== this.tab.content) {
                            this.tab.content = newContent;
                            this.tab.isModified = true;
                            if (this.onContentChange) {
                                this.onContentChange(this.tab.id, newContent);
                            }
                        }
                    }
                    if (update.selectionSet || update.docChanged) {
                        if (this.onCursorChange) {
                            const pos = this.getCursorPosition();
                            this.onCursorChange(pos.line, pos.col);
                        }
                    }
                })
            ],
            parent: this.container       // DOM-Element für den Editor
        });

        // Adjust editor container
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';

        // Klick außerhalb schließt Kontextmenü
        // Event-Listener mit gespeicherten Referenzen für Cleanup
        this._boundClickHandler = () => this.hideContextMenu();
        this._boundKeyHandler = (e) => {
            if (e.key === 'Escape') this.hideContextMenu();
        };
        document.addEventListener('click', this._boundClickHandler);
        document.addEventListener('keydown', this._boundKeyHandler);
    }

    // Zeigt das Kontextmenü an der angegebenen Position
    showContextMenu(x, y) {
        this.hideContextMenu();

        const selection = this.getSelectedText();

        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'editor-context-menu';
        this.contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: #252526;
            border: 1px solid #454545;
            border-radius: 4px;
            padding: 4px 0;
            min-width: 180px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
        `;

        const menuItems = [
            { label: 'AI fragen...', icon: '🤖', action: 'askAI', disabled: !selection },
            { type: 'separator' },
            { label: 'Ausschneiden', icon: '✂️', action: 'cut', shortcut: 'Ctrl+X', disabled: !selection },
            { label: 'Kopieren', icon: '📋', action: 'copy', shortcut: 'Ctrl+C', disabled: !selection },
            { label: 'Einfügen', icon: '📄', action: 'paste', shortcut: 'Ctrl+V' },
            { type: 'separator' },
            { label: 'Alles auswählen', action: 'selectAll', shortcut: 'Ctrl+A' },
            { type: 'separator' },
            { label: 'Format Dokument', action: 'formatDocument', shortcut: 'Shift+Alt+F' },
            { label: 'Format Selektion', action: 'formatSelection', shortcut: 'Ctrl+K Ctrl+F', disabled: !selection },
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
            leftPart.innerHTML = `${item.icon ? item.icon + ' ' : ''}${item.label}`;

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

        // Position anpassen wenn außerhalb des Viewports (alle Kanten)
        const rect = this.contextMenu.getBoundingClientRect();
        let newLeft = x;
        let newTop = y;

        // Rechter Rand
        if (rect.right > window.innerWidth) {
            newLeft = window.innerWidth - rect.width - 10;
        }
        // Unterer Rand
        if (rect.bottom > window.innerHeight) {
            newTop = window.innerHeight - rect.height - 10;
        }
        // Linker Rand (falls Fenster sehr klein)
        if (newLeft < 10) {
            newLeft = 10;
        }
        // Oberer Rand
        if (newTop < 10) {
            newTop = 10;
        }

        this.contextMenu.style.left = `${newLeft}px`;
        this.contextMenu.style.top = `${newTop}px`;
    }

    hideContextMenu() {
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
        this.contextMenu = null;
    }

    executeContextAction(action) {
        switch (action) {
            case 'askAI':
                const selectedText = this.getSelectedText();
                if (selectedText && this.onAskAI) {
                    this.onAskAI(selectedText, this.tab.type);
                }
                break;
            case 'cut':
                this.cut();
                break;
            case 'copy':
                this.copy();
                break;
            case 'paste':
                this.paste();
                break;
            case 'selectAll':
                this.selectAll();
                break;
            case 'formatDocument':
                this.formatDocument();
                break;
            case 'formatSelection':
                this.formatSelection();
                break;
        }
    }

    getSelectedText() {
        if (!this.view) return '';
        const { from, to } = this.view.state.selection.main;
        if (from === to) return '';
        return this.view.state.sliceDoc(from, to);
    }

    setContent(content) {
        if (this.view) {
            this.view.dispatch({
                changes: {
                    from: 0,
                    to: this.view.state.doc.length,
                    insert: content
                }
            });
        }
    }

    getContent() {
        return this.view ? this.view.state.doc.toString() : '';
    }

    destroy() {
        this.hideContextMenu();
        // Event-Listener entfernen (Memory Leak vermeiden)
        if (this._boundClickHandler) {
            document.removeEventListener('click', this._boundClickHandler);
            this._boundClickHandler = null;
        }
        if (this._boundKeyHandler) {
            document.removeEventListener('keydown', this._boundKeyHandler);
            this._boundKeyHandler = null;
        }
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
    }

    // updateLanguage wechselt die Programmiersprache des Editors.
    // CodeMirror 6 unterstützt keinen dynamischen Extension-Austausch,
    // daher wird der gesamte Editor zerstört und neu erstellt.
    // Der Inhalt bleibt erhalten (wird aus this.tab.content wiederhergestellt).
    updateLanguage(type) {
        if (this.view) {
            this.tab.type = type;
            this.destroy();
            this.initialize();
        }
    }

    // Die folgenden Methoden (cut, copy, paste, undo, redo, etc.) werden
    // von executeEditorCommand() in main.js aufgerufen.
    // Clipboard-Operationen nutzen die Wails-Runtime (window.runtime.ClipboardSetText/
    // ClipboardGetText), da der WebView keinen direkten Clipboard-Zugriff hat.
    cut() {
        if (!this.view) return false;
        this.view.focus();
        const { from, to } = this.view.state.selection.main;
        if (from === to) return false;

        const text = this.view.state.sliceDoc(from, to);
        if (text && window.runtime?.ClipboardSetText) {
            window.runtime.ClipboardSetText(text).catch(err => {
                console.error('Clipboard cut failed:', err);
            });
            this.view.dispatch({
                changes: { from, to, insert: "" }
            });
        }
        return true;
    }

    copy() {
        if (!this.view) return false;
        this.view.focus();
        const { from, to } = this.view.state.selection.main;
        const text = this.view.state.sliceDoc(from, to);

        if (text && window.runtime?.ClipboardSetText) {
            window.runtime.ClipboardSetText(text).catch(err => {
                console.error('Clipboard copy failed:', err);
            });
        }
        return true;
    }

    paste() {
        if (!this.view || !window.runtime?.ClipboardGetText) return false;
        this.view.focus();

        (async () => {
            try {
                const text = await window.runtime.ClipboardGetText();
                if (text != null) {
                    const { from, to } = this.view.state.selection.main;
                    this.view.dispatch({
                        changes: { from, to, insert: text }
                    });
                    this.view.focus();
                }
            } catch (err) {
                console.error('Clipboard paste failed:', err);
            }
        })();

        return true;
    }

    undo() {
        if (!this.view) return false;
        this.view.focus();
        return cmUndo(this.view);
    }

    redo() {
        if (!this.view) return false;
        this.view.focus();
        return cmRedo(this.view);
    }

    selectAll() {
        if (!this.view) return false;
        this.view.focus();
        return cmSelectAll(this.view);
    }

    openSearch() {
        if (!this.view) return false;
        this.view.focus();
        openSearchPanel(this.view);
        return true;
    }

    openReplace() {
        if (!this.view) return false;
        this.view.focus();
        openSearchPanel(this.view);
        // Open replace by clicking the toggle button after panel is open
        requestAnimationFrame(() => {
            const panel = this.view.dom.querySelector('.cm-search');
            if (panel) {
                const replaceBtn = panel.querySelector('button[name="replace"]');
                if (replaceBtn) {
                    replaceBtn.click();
                } else {
                    // Toggle to show replace fields
                    const toggleBtn = panel.querySelector('button.ͼ1y, button[aria-label]');
                    if (toggleBtn && toggleBtn.textContent.includes('replace')) {
                        toggleBtn.click();
                    }
                }
                // Focus the replace field
                const replaceField = panel.querySelector('input[name="replace"]');
                if (replaceField) replaceField.focus();
            }
        });
        return true;
    }

    goToLine() {
        if (!this.view) return false;
        this.view.focus();
        gotoLine(this.view);
        return true;
    }

    // Scrollt direkt zu einer bestimmten Zeile (ohne Dialog)
    scrollToLine(lineNumber) {
        if (!this.view) return false;

        const doc = this.view.state.doc;
        const maxLine = doc.lines;

        // Zeilennummer begrenzen
        lineNumber = Math.max(1, Math.min(lineNumber, maxLine));

        const line = doc.line(lineNumber);

        // Cursor an den Zeilenanfang setzen und Zeile in Sichtbereich scrollen
        this.view.dispatch({
            selection: { anchor: line.from },
            scrollIntoView: true
        });

        this.view.focus();
        return true;
    }

    getCursorPosition() {
        if (!this.view) return { line: 1, col: 1 };
        const pos = this.view.state.selection.main.head;
        const line = this.view.state.doc.lineAt(pos);
        return { line: line.number, col: pos - line.from + 1 };
    }

    // Einfache Code-Formatierung ohne externe Abhängigkeiten
    formatCode(code, type) {
        // JSON: Native Formatierung
        if (type === 'json') {
            try {
                return JSON.stringify(JSON.parse(code), null, 4);
            } catch {
                return null; // Ungültiges JSON
            }
        }

        // JavaScript/HTML/CSS: Einrückung korrigieren
        if (['javascript', 'html', 'css'].includes(type)) {
            return this.formatWithIndentation(code);
        }

        return null;
    }

    // Formatiert Code mit korrekter Einrückung basierend auf Klammern
    formatWithIndentation(code) {
        const lines = code.split('\n');
        const result = [];
        let indentLevel = 0;
        const indentStr = '    '; // 4 Spaces

        for (let line of lines) {
            let trimmed = line.trim();
            if (!trimmed) {
                result.push('');
                continue;
            }

            // Einrückung verringern bei schließenden Klammern am Anfang
            const opensWithClose = /^[\}\]\)]/.test(trimmed);
            if (opensWithClose && indentLevel > 0) {
                indentLevel--;
            }

            // Zeile mit aktueller Einrückung hinzufügen
            result.push(indentStr.repeat(indentLevel) + trimmed);

            // Zähle öffnende und schließende Klammern (außerhalb von Strings)
            let opens = 0, closes = 0;
            let inString = false, stringChar = '';
            for (let i = 0; i < trimmed.length; i++) {
                const ch = trimmed[i];
                const prev = i > 0 ? trimmed[i - 1] : '';

                if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
                    inString = true;
                    stringChar = ch;
                } else if (inString && ch === stringChar && prev !== '\\') {
                    inString = false;
                } else if (!inString) {
                    if (ch === '{' || ch === '[' || ch === '(') opens++;
                    if (ch === '}' || ch === ']' || ch === ')') closes++;
                }
            }

            // Einrückung anpassen (schließende am Anfang schon berücksichtigt)
            indentLevel += opens - closes;
            if (opensWithClose) indentLevel++; // Korrektur für bereits verringerte
            indentLevel = Math.max(0, indentLevel);
        }

        return result.join('\n');
    }

    formatDocument() {
        if (!this.view) return false;
        this.view.focus();

        const content = this.view.state.doc.toString();
        const formatted = this.formatCode(content, this.tab.type);

        if (formatted === null) {
            console.log(`Formatierung für "${this.tab.type}" nicht unterstützt oder Syntax-Fehler`);
            return false;
        }

        if (formatted !== content) {
            this.view.dispatch({
                changes: { from: 0, to: this.view.state.doc.length, insert: formatted }
            });
        }
        return true;
    }

    formatSelection() {
        if (!this.view) return false;
        this.view.focus();

        const { from, to } = this.view.state.selection.main;
        if (from === to) return false;

        const selectedText = this.view.state.sliceDoc(from, to);
        const formatted = this.formatCode(selectedText, this.tab.type);

        if (formatted === null) {
            console.log(`Formatierung für "${this.tab.type}" nicht unterstützt oder Syntax-Fehler`);
            return false;
        }

        if (formatted !== selectedText) {
            this.view.dispatch({
                changes: { from, to, insert: formatted }
            });
        }
        return true;
    }

}