// tabview.js — Zentrale Tab-Verwaltung des Editors.
// TabView verwaltet die Tab-Leiste und die zugehörigen Editor-Instanzen.
//
// Architektur:
//   - tabs[]: Array von Tab-Objekten (Datenmodell: ID, Titel, Inhalt, Typ, Pfad)
//   - editors: Map (tabId → CodeEditor) — CodeMirror-Instanzen bleiben beim
//     Tab-Wechsel erhalten und werden nur per display:none versteckt.
//     Das ist schneller als Zerstören/Neuerstellen und bewahrt den Undo-Verlauf.
//   - aiPanels: Map (tabId → AiPanel) — separate Verwaltung für KI-Tabs
//
// Tab-Typen: 'javascript', 'html', 'css', 'python', etc. (Code-Tabs),
//            'image' (Bildanzeige), 'pdf' (PDF-Viewer), 'ai' (KI-Panel)
import { APP_CONFIG } from './lib/constants.js';
import { Tab } from './tab.js';
import { CodeEditor } from './editor.js';
import { AiPanel } from './aipanel.js';
import { SplitView } from './splitview.js';
import { TerminalPanel } from './terminalpanel.js';
import { generateUUID, escapeHtml } from './lib/utils.js';

export class TabView {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.tabs = [];                // Alle geöffneten Tabs (Tab-Objekte)
        this.activeTabId = null;       // ID des aktuell sichtbaren Tabs
        this.editors = new Map();      // tabId → CodeEditor (CodeMirror-Wrapper)
        this.aiPanels = new Map();     // tabId → AiPanel (KI-Chat-Instanzen)
        this.splitViews = new Map();   // tabId → SplitView (Split-Editor-Ansichten)
        this.terminalPanels = new Map(); // tabId → TerminalPanel (Terminal-Instanzen)
        this.nextTabNumber = 1;        // Zähler für "Untitled-N" Fallback-Namen

        this.options = {
            maxTabs: 20,
            defaultContent: '// New file\n// Start coding here...',
            ...options
        };

        this.initializeUI();
        this.setupEventListeners();

        // Beim Start wird immer ein leerer Tab erstellt
        this.createNewTab();
    }

    // initializeUI baut die DOM-Struktur programmatisch auf (kein HTML-Template).
    // Ergebnis:
    //   <div class="tab-view-container">      ← this.container
    //     <div class="tabs-header">           ← Tab-Leiste oben
    //       <div class="tabs-list">...</div>  ← Horizontale Liste der Tabs
    //       <button class="add-tab-btn">+</button>
    //     </div>
    //     <div class="editor-container">      ← Hier wird der Editor/Viewer angezeigt
    //       <div data-tab-id="...">...</div>  ← Pro Tab ein Wrapper (editor/image/pdf/ai)
    //     </div>
    //   </div>
    initializeUI() {
        this.container.innerHTML = '';
        this.container.className = 'tab-view-container';

        this.tabsHeader = document.createElement('div');
        this.tabsHeader.className = 'tabs-header';

        this.tabsList = document.createElement('div');
        this.tabsList.className = 'tabs-list';

        this.addTabBtn = document.createElement('button');
        this.addTabBtn.className = 'add-tab-btn';
        this.addTabBtn.innerHTML = '+';
        this.addTabBtn.title = 'New Tab';

        this.editorContainer = document.createElement('div');
        this.editorContainer.className = 'editor-container';

        this.tabsHeader.appendChild(this.tabsList);
        this.tabsHeader.appendChild(this.addTabBtn);
        this.container.appendChild(this.tabsHeader);
        this.container.appendChild(this.editorContainer);
    }

    setupEventListeners() {
        // Add tab button
        this.addTabBtn.addEventListener('click', () => {
            this.createNewTab();
        });

        // Close tab on middle click
        this.tabsList.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                const tabElement = e.target.closest('.tab');
                if (tabElement) {
                    const tabId = tabElement.dataset.tabId;
                    this.closeTab(tabId);
                    e.preventDefault();
                }
            }
        });

    }

    createNewTab(title = APP_CONFIG.DEFAULT_TAB_NAME, content = null, filepath = null, type = 'Text') {
        if (this.tabs.length >= this.options.maxTabs) {
            console.warn(`Maximum tabs (${this.options.maxTabs}) reached`);
            return null;
        }

        console.log('Creating new tab:', title, filepath, type);

        const tabId = generateUUID();
        const tabTitle = title || `Untitled-${this.nextTabNumber++}`;
        let tabContent = content || this.options.defaultContent;

        const tab = new Tab(tabId, tabTitle, tabContent, type, true, false, filepath);
        this.tabs.push(tab);
        
        this.createTabElement(tab);
        this.setActiveTab(tabId);
        
        return tabId;
    }

    createTabElement(tab) {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.tabId = tab.id;
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-title';
        titleSpan.textContent = tab.getDisplayTitle();
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Close Tab';
        
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab.id);
        });
        
        tabElement.appendChild(titleSpan);
        tabElement.appendChild(closeBtn);
        
        tabElement.addEventListener('click', () => {
            this.setActiveTab(tab.id);
        });
        
        this.tabsList.appendChild(tabElement);
        return tabElement;
    }

    // setActiveTab wechselt den aktiven Tab.
    // Ablauf: Alten Tab deaktivieren (CSS-Klasse entfernen, Editor verstecken)
    //       → Neuen Tab aktivieren (CSS-Klasse setzen, Editor anzeigen/erstellen)
    // Der alte Editor wird NICHT zerstört, sondern nur per display:none versteckt.
    setActiveTab(tabId) {
        if (this.activeTabId) {
            const oldTab = this.tabs.find(t => t.id === this.activeTabId);
            if (oldTab) {
                oldTab.isActive = false;
                const oldTabElement = this.tabsList.querySelector(`[data-tab-id="${this.activeTabId}"]`);
                if (oldTabElement) {
                    oldTabElement.classList.remove('active');
                }
            }
            
            // Hide current wrapper (editor, image, pdf, ai)
            const oldWrapper = this.editorContainer.querySelector(`[data-tab-id="${this.activeTabId}"]`);
            if (oldWrapper) {
                oldWrapper.style.display = 'none';
            }
        }
        
        // Activate new tab
        const newTab = this.tabs.find(t => t.id === tabId);
        if (!newTab) return;
        
        newTab.isActive = true;
        this.activeTabId = tabId;
        
        const newTabElement = this.tabsList.querySelector(`[data-tab-id="${tabId}"]`);
        if (newTabElement) {
            newTabElement.classList.add('active');
            // Scroll tab into view if needed
            newTabElement.scrollIntoView({ behavior: 'smooth', inline: 'nearest' });
        }
        
        // Show or create editor
        this.showEditorForTab(newTab);
        
        // Update tab title
        this.updateTabTitle(tabId);

        if (this.options.onTabChange) {
            this.options.onTabChange();
        }

        return this.getTab(tabId);
    }

    // showEditorForTab zeigt den passenden Viewer/Editor für einen Tab an.
    // Wenn der Tab schon einen Wrapper hat → anzeigen (display:block).
    // Wenn nicht → neuen Wrapper erstellen, je nach Tab-Typ:
    //   'ai'    → AiPanel (KI-Chat)
    //   'image' → <img>-Tag mit Data-URI
    //   'pdf'   → <embed>-Tag mit Data-URI
    //   sonst   → CodeEditor (CodeMirror 6)
    showEditorForTab(tab) {
        const existingWrapper = this.editorContainer.querySelector(`[data-tab-id="${tab.id}"]`);

        if (existingWrapper) {
            existingWrapper.style.display = 'block';

            // Split-View: CodeMirror Layout neu berechnen nach display:none
            if (tab.type === 'split' && this.splitViews.has(tab.id)) {
                const sv = this.splitViews.get(tab.id);
                sv.editors.forEach(e => { if (e?.view) e.view.requestMeasure(); });
            }

            // Update editor language if changed (only for code tabs)
            if (tab.type !== 'image' && tab.type !== 'pdf' && this.editors.has(tab.id)) {
                const editor = this.editors.get(tab.id);
                if (editor.tab.type !== tab.type) {
                    editor.updateLanguage(tab.type);
                }
            }
            return;
        }

        // Create new wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'editor-wrapper';
        wrapper.dataset.tabId = tab.id;
        wrapper.style.display = 'block';
        wrapper.style.height = '100%';
        this.editorContainer.appendChild(wrapper);

        if (tab.type === 'ai') {
            // AI panel
            const aiPanel = new AiPanel(tab.id, { dom: wrapper });
            this.aiPanels.set(tab.id, aiPanel);
        } else if (tab.type === 'split') {
            // Split view — zwei unabhängige Editor-Panes
            const splitView = new SplitView(tab.id, wrapper, {
                orientation: tab.splitOrientation || 'vertical',
                onContentChange: (tabId, isModified) => {
                    tab.isModified = isModified;
                    this.onEditorContentChange(tabId, null);
                },
                onCursorChange: this.options.onCursorChange || null,
                onFileOpenRequest: this.options.onSplitPaneFileOpen || null
            });
            this.splitViews.set(tab.id, splitView);
        } else if (tab.type === 'terminal') {
            // Terminal panel — interaktive Shell-Sitzung
            const terminalPanel = new TerminalPanel(tab.id, { dom: wrapper });
            this.terminalPanels.set(tab.id, terminalPanel);
        } else if (tab.type === 'image') {
            // Image viewer — content is a data URI
            // escapeHtml verhindert XSS durch bösartige Dateinamen
            wrapper.classList.add('image-viewer');
            wrapper.innerHTML = `
                <div class="image-container">
                    <img src="${tab.content}" alt="${escapeHtml(tab.title)}" class="loaded-image">
                </div>
                <div class="image-info">${escapeHtml(tab.title)}</div>
            `;
        } else if (tab.type === 'pdf') {
            // PDF viewer — content is a data URI
            wrapper.classList.add('pdf-viewer');
            wrapper.innerHTML = `
                <embed src="${tab.content}" type="application/pdf" class="loaded-pdf">
            `;
        } else {
            // Code editor
            const editor = new CodeEditor(wrapper, tab, (tabId, content) => {
                this.onEditorContentChange(tabId, content);
            }, this.options.onCursorChange || null, (selectedText, fileType) => {
                // Ask AI callback
                if (this.options.onAskAI) {
                    this.options.onAskAI(selectedText, fileType);
                }
            });
            this.editors.set(tab.id, editor);
        }
    }

    // onEditorContentChange wird vom CodeEditor aufgerufen, wenn der Benutzer
    // Text ändert. Aktualisiert den Tab-Titel (zeigt "*" für ungespeicherte Änderungen)
    // und benachrichtigt main.js über den Callback (für Menü-Status-Update).
    onEditorContentChange(tabId, content) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            const tabElement = this.tabsList.querySelector(`[data-tab-id="${tabId}"]`);
            if (tabElement) {
                const titleSpan = tabElement.querySelector('.tab-title');
                if (titleSpan) {
                    titleSpan.textContent = tab.getDisplayTitle();
                }
            }
            if (this.options.onTabChange) {
                this.options.onTabChange();
            }
        }
    }

    updateTabTitle(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const tabElement = this.tabsList.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            const titleSpan = tabElement.querySelector('.tab-title');
            if (titleSpan) {
                titleSpan.textContent = tab.getDisplayTitle();
            }
        }
    }

    // closeTab schließt einen Tab und räumt alle zugehörigen Ressourcen auf.
    // Ablauf: Ungespeicherte Änderungen prüfen → Tab aus Array entfernen →
    //         DOM-Element entfernen → Editor/AiPanel zerstören →
    //         Falls aktiver Tab geschlossen: nächsten Tab aktivieren.
    //         Falls letzter Tab geschlossen: neuen leeren Tab erstellen.
    closeTab(tabId) {
        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return false;

        const tab = this.tabs[tabIndex];

        // Bei KI-/Terminal-Tabs keine Warnung (kein speicherbarer Inhalt)
        if (tab.type !== 'ai' && tab.type !== 'terminal' && tab.isModified) {
            if (!confirm(`"${tab.title}" has unsaved changes. Close anyway?`)) {
                return false;
            }
        }

        // Remove tab from array
        this.tabs.splice(tabIndex, 1);

        // Remove tab element
        const tabElement = this.tabsList.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }

        // Destroy editor (if code tab)
        if (this.editors.has(tabId)) {
            this.editors.get(tabId).destroy();
            this.editors.delete(tabId);
        }

        // Destroy AI panel (if AI tab)
        if (this.aiPanels.has(tabId)) {
            this.aiPanels.get(tabId).destroy();
            this.aiPanels.delete(tabId);
        }

        // Destroy split view (if split tab)
        if (this.splitViews.has(tabId)) {
            this.splitViews.get(tabId).destroy();
            this.splitViews.delete(tabId);
        }

        // Destroy terminal panel (if terminal tab)
        if (this.terminalPanels.has(tabId)) {
            this.terminalPanels.get(tabId).destroy();
            this.terminalPanels.delete(tabId);
        }

        // Remove wrapper (editor or image viewer)
        const wrapper = this.editorContainer.querySelector(`[data-tab-id="${tabId}"]`);
        if (wrapper) {
            wrapper.remove();
        }
        
        // If we closed the active tab, activate another one
        if (tabId === this.activeTabId) {
            if (this.tabs.length > 0) {
                const nextTabIndex = Math.min(tabIndex, this.tabs.length - 1);
                this.setActiveTab(this.tabs[nextTabIndex].id);
            } else {
                this.activeTabId = null;
                // Create new empty tab if all tabs closed
                this.createNewTab();
            }
        }
        
        return true;
    }

    getTab(tabId) {
        return this.tabs.find(t => t.id === tabId);
    }

    updateTab(tabId, updates) {
        const tab = this.getTab(tabId);
        if (!tab) return false;
        
        Object.assign(tab, updates);
        this.updateTabTitle(tabId);
        
        // If type changed, update editor
        if (updates.type && this.editors.has(tabId)) {
            this.editors.get(tabId).updateLanguage(updates.type);
        }
        
        return true;
    }

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    }

    getAllTabs() {
        return [...this.tabs];
    }

    count() {
        return this.tabs.length;
    }

    // Scrollt im aktiven Tab zu einer bestimmten Zeile
    scrollToLine(lineNumber) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return false;

        const editor = this.editors.get(activeTab.id);
        if (!editor) return false;

        return editor.scrollToLine(lineNumber);
    }
}