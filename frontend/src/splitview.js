// splitview.js — Split-Editor-Ansicht mit zwei unabhängigen Editor-Panes.
// Jeder Pane hat einen eigenen CodeEditor, eigene Dateidaten und eine Toolbar.
// Wird als Tab-Typ 'split' in TabView verwaltet (analog zu AiPanel für 'ai').

import { CodeEditor } from './editor.js';
import { generateUUID } from './lib/utils.js';

export class SplitView {
    constructor(tabId, wrapper, options = {}) {
        this.tabId = tabId;
        this.wrapper = wrapper;
        this.orientation = options.orientation || 'vertical';
        this.onContentChange = options.onContentChange || null;
        this.onCursorChange = options.onCursorChange || null;
        this.onFileOpenRequest = options.onFileOpenRequest || null;

        this.focusedPaneIndex = 0;

        // Pane-Datenmodell — gleiche Shape wie Tab, damit CodeEditor sie direkt nutzt
        this.panes = [
            { id: generateUUID(), title: null, content: '', type: 'text', isActive: true, isModified: false, path: null },
            { id: generateUUID(), title: null, content: '', type: 'text', isActive: true, isModified: false, path: null }
        ];

        this.editors = [null, null];
        this.paneElements = [null, null];

        this.buildUI();
    }

    buildUI() {
        this.wrapper.innerHTML = '';

        // Hauptcontainer
        const container = document.createElement('div');
        container.className = `splitview-container splitview-${this.orientation}`;

        // Obere Toolbar mit Toggle-Button
        const toolbar = document.createElement('div');
        toolbar.className = 'splitview-toolbar';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'splitview-toggle-btn';
        toggleBtn.title = 'Ausrichtung wechseln';
        toggleBtn.textContent = this.orientation === 'vertical' ? '⇔ → ⇕' : '⇕ → ⇔';
        toggleBtn.addEventListener('click', () => this.toggleOrientation());

        const label = document.createElement('span');
        label.className = 'splitview-orientation-label';
        label.textContent = this.orientation === 'vertical' ? 'Vertikal' : 'Horizontal';

        toolbar.appendChild(toggleBtn);
        toolbar.appendChild(label);
        container.appendChild(toolbar);

        // Panes-Bereich
        const panesContainer = document.createElement('div');
        panesContainer.className = 'splitview-panes';

        // Pane 0
        const pane0 = this.createPaneElement(0);
        panesContainer.appendChild(pane0);

        // Divider (resizable)
        const divider = document.createElement('div');
        divider.className = 'splitview-divider';
        this.setupDividerResize(divider, panesContainer);
        panesContainer.appendChild(divider);

        // Pane 1
        const pane1 = this.createPaneElement(1);
        panesContainer.appendChild(pane1);

        container.appendChild(panesContainer);
        this.wrapper.appendChild(container);

        // Editoren erstellen
        this.createEditorForPane(0);
        this.createEditorForPane(1);

        // Fokus auf Pane 0
        this.updatePaneFocusStyles();
    }

    createPaneElement(paneIndex) {
        const pane = document.createElement('div');
        pane.className = 'splitview-pane';
        pane.dataset.paneIndex = paneIndex;

        // Pane-Toolbar
        const paneToolbar = document.createElement('div');
        paneToolbar.className = 'splitview-pane-toolbar';

        const filename = document.createElement('span');
        filename.className = 'splitview-pane-filename';
        filename.textContent = 'Leer';

        const openBtn = document.createElement('button');
        openBtn.className = 'splitview-pane-open-btn';
        openBtn.textContent = 'Öffnen';
        openBtn.title = 'Datei in diesen Bereich laden';
        openBtn.addEventListener('click', () => {
            if (this.onFileOpenRequest) {
                this.onFileOpenRequest(this, paneIndex);
            }
        });

        paneToolbar.appendChild(filename);
        paneToolbar.appendChild(openBtn);
        pane.appendChild(paneToolbar);

        // Editor-Container
        const editorContainer = document.createElement('div');
        editorContainer.className = 'splitview-pane-editor';
        pane.appendChild(editorContainer);

        this.paneElements[paneIndex] = pane;

        // Focus-Tracking
        this.setupFocusTracking(paneIndex);

        return pane;
    }

    createEditorForPane(paneIndex) {
        const pane = this.panes[paneIndex];
        const editorContainer = this.paneElements[paneIndex].querySelector('.splitview-pane-editor');

        if (this.editors[paneIndex]) {
            this.editors[paneIndex].destroy();
        }

        const editor = new CodeEditor(
            editorContainer,
            pane,
            (id, content) => {
                this.updatePaneTitle(paneIndex);
                if (this.onContentChange) {
                    this.onContentChange(this.tabId, this.isModified());
                }
            },
            (line, col) => {
                if (paneIndex === this.focusedPaneIndex && this.onCursorChange) {
                    this.onCursorChange(line, col);
                }
            }
        );

        this.editors[paneIndex] = editor;
    }

    loadFileInPane(paneIndex, filename, content, type, filepath) {
        const pane = this.panes[paneIndex];
        pane.title = filename;
        pane.content = content;
        pane.type = type;
        pane.path = filepath;
        pane.isModified = false;

        this.createEditorForPane(paneIndex);
        this.updatePaneTitle(paneIndex);
    }

    toggleOrientation() {
        this.orientation = this.orientation === 'vertical' ? 'horizontal' : 'vertical';

        const container = this.wrapper.querySelector('.splitview-container');
        container.classList.remove('splitview-vertical', 'splitview-horizontal');
        container.classList.add(`splitview-${this.orientation}`);

        // Toggle-Button und Label aktualisieren
        const toggleBtn = this.wrapper.querySelector('.splitview-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = this.orientation === 'vertical' ? '⇔ → ⇕' : '⇕ → ⇔';
        }

        const label = this.wrapper.querySelector('.splitview-orientation-label');
        if (label) {
            label.textContent = this.orientation === 'vertical' ? 'Vertikal' : 'Horizontal';
        }

        // Pane-Größen zurücksetzen (50/50)
        this.resetPaneSizes();

        // CodeMirror Layout neu berechnen
        this.editors.forEach(editor => {
            if (editor && editor.view) {
                editor.view.requestMeasure();
            }
        });
    }

    setupDividerResize(divider, panesContainer) {
        let dragging = false;

        const onMouseDown = (e) => {
            e.preventDefault();
            dragging = true;
            document.body.classList.add('splitview-resizing');
            // Cursor für die gesamte Seite setzen
            document.body.style.cursor =
                this.orientation === 'vertical' ? 'col-resize' : 'row-resize';

            const onMouseMove = (e) => {
                if (!dragging) return;

                const rect = panesContainer.getBoundingClientRect();
                let ratio;

                if (this.orientation === 'vertical') {
                    ratio = (e.clientX - rect.left) / rect.width;
                } else {
                    ratio = (e.clientY - rect.top) / rect.height;
                }

                // Minimum 10%, Maximum 90%
                ratio = Math.max(0.1, Math.min(0.9, ratio));

                this.paneElements[0].style.flex = 'none';
                this.paneElements[1].style.flex = 'none';

                if (this.orientation === 'vertical') {
                    this.paneElements[0].style.width = `${ratio * 100}%`;
                    this.paneElements[0].style.height = '';
                    this.paneElements[1].style.width = `${(1 - ratio) * 100}%`;
                    this.paneElements[1].style.height = '';
                } else {
                    this.paneElements[0].style.height = `${ratio * 100}%`;
                    this.paneElements[0].style.width = '';
                    this.paneElements[1].style.height = `${(1 - ratio) * 100}%`;
                    this.paneElements[1].style.width = '';
                }

                // CodeMirror sofort neu berechnen
                this.editors.forEach(editor => {
                    if (editor?.view) editor.view.requestMeasure();
                });
            };

            const onMouseUp = () => {
                dragging = false;
                document.body.classList.remove('splitview-resizing');
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        divider.addEventListener('mousedown', onMouseDown);
    }

    resetPaneSizes() {
        this.paneElements.forEach(el => {
            if (el) {
                el.style.flex = '1';
                el.style.width = '';
                el.style.height = '';
            }
        });
    }

    setupFocusTracking(paneIndex) {
        const paneEl = this.paneElements[paneIndex];
        paneEl.addEventListener('mousedown', () => {
            this.focusedPaneIndex = paneIndex;
            this.updatePaneFocusStyles();
            if (this.editors[paneIndex] && this.onCursorChange) {
                const pos = this.editors[paneIndex].getCursorPosition();
                this.onCursorChange(pos.line, pos.col);
            }
        });
    }

    updatePaneFocusStyles() {
        this.paneElements.forEach((el, i) => {
            if (el) {
                el.classList.toggle('splitview-pane-focused', i === this.focusedPaneIndex);
            }
        });
    }

    updatePaneTitle(paneIndex) {
        const pane = this.panes[paneIndex];
        const filenameSpan = this.paneElements[paneIndex].querySelector('.splitview-pane-filename');
        if (filenameSpan) {
            const name = pane.title || 'Leer';
            filenameSpan.textContent = pane.isModified ? `${name} *` : name;
        }
    }

    isModified() {
        return this.panes[0].isModified || this.panes[1].isModified;
    }

    getFocusedEditor() {
        return this.editors[this.focusedPaneIndex];
    }

    getFocusedPane() {
        return this.panes[this.focusedPaneIndex];
    }

    getFocusedPaneData() {
        const pane = this.panes[this.focusedPaneIndex];
        return {
            content: pane.content,
            path: pane.path,
            title: pane.title,
            isModified: pane.isModified
        };
    }

    markFocusedPaneSaved(path, title) {
        const pane = this.panes[this.focusedPaneIndex];
        pane.path = path;
        pane.title = title;
        pane.isModified = false;
        this.updatePaneTitle(this.focusedPaneIndex);
        if (this.onContentChange) {
            this.onContentChange(this.tabId, this.isModified());
        }
    }

    destroy() {
        this.editors.forEach(editor => {
            if (editor) editor.destroy();
        });
        this.editors = [null, null];
        if (this.wrapper) {
            this.wrapper.innerHTML = '';
        }
    }
}
