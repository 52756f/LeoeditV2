// main.js — Einstiegspunkt des Frontends.
// Hier werden alle Hauptkomponenten initialisiert und miteinander verbunden:
//   - TabView: Verwaltung der Editor-Tabs (erstellen, wechseln, schließen)
//   - Menu: Menüleiste mit Datei/Bearbeiten/Ansicht/Über
//   - Toolbar: Schnellzugriff-Buttons (Neu, Öffnen, Speichern, etc.)
//
// Die Imports aus "../wailsjs/go/main/App.js" sind automatisch generierte
// Wails-Bindings — sie rufen Go-Funktionen auf dem Backend auf.
import { LoadFile, SaveFile, SaveFileUnder, ReadBinaryFile, ReadTextFile, GetStartupFiles } from "../wailsjs/go/main/App.js";
import { getFilenameFromPath, getFileType } from './lib/utils.js'
import { Menu } from './lib/menu.js';
import { Toolbar } from './lib/toolbar.js';
import { LeftToolbar } from './clsLeftToolbar.js';
import { FileExplorer } from './clsFileExplorer.js';
import { ProjectExplorer } from './clsProjectExplorer.js';
import { SearchPanel } from './clsSearchPanel.js';
import { TabView } from './tabview.js';
import { APP_CONFIG, STATUS_MESSAGES } from './lib/constants.js';
import { StatusBar } from './statusbar.js';
import { showAboutDialog } from './dialogs/aboutDialog.js';
import { showApiKeyDialog } from './dialogs/apiKeyDialog.js';
import { showFontDialog } from './dialogs/fontDialog.js';
import '@xterm/xterm/css/xterm.css'
import './assets/css/app.css';
import './assets/css/menu.css';
import './assets/css/toolbar.css';
import './assets/css/tabs.css';
import './assets/css/sidebar.css';
import './assets/css/statusbar.css';
import './assets/css/dialogs.css';
import './assets/css/fileexplorer.css';
import './assets/css/projectexplorer.css';
import './assets/css/searchpanel.css';
import './assets/css/splitview.css';

// Globale Referenzen auf die drei Hauptkomponenten.
// Werden in DOMContentLoaded initialisiert und von allen Funktionen genutzt.
let tabView;
let menu;
let toolbar;
let sidebar;
let fileExplorer;
let projectExplorer;
let searchPanel;
let statusbar;

// Drag & Drop auf Fensterebene: Verhindert, dass der Browser beim Ablegen
// einer Datei zur Datei navigiert (Standardverhalten). Stattdessen wird
// der "+"-Cursor angezeigt. Die eigentliche Dateiverarbeitung passiert
// im Go-Backend (OnFileDrop in app.go).
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}, false);
window.addEventListener('drop', (e) => {
  e.preventDefault();
}, false);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {

  // Setup layout: menu → toolbar → [sidebar | editor], all inside #app-container
  const app_container = document.getElementById('app-container');

  // Create menu container and insert before toolbar
  const menuContainer = document.createElement('div');
  menuContainer.id = 'menu-container';
  app_container.prepend(menuContainer);

  // Create content wrapper (sidebar + editor side by side)
  const contentWrapper = document.createElement('div');
  contentWrapper.id = 'content-wrapper';
  app_container.appendChild(contentWrapper);

  // Create left toolbar container inside content wrapper
  const leftToolbarContainer = document.createElement('div');
  leftToolbarContainer.id = 'left-toolbar-container';
  contentWrapper.appendChild(leftToolbarContainer);

  sidebar = new LeftToolbar('left-toolbar-container');

  // Create file explorer container inside content wrapper
  const fileExplorerContainer = document.createElement('div');
  fileExplorerContainer.id = 'file-explorer-container';
  contentWrapper.appendChild(fileExplorerContainer);

  // Create project explorer container inside content wrapper
  const projectExplorerContainer = document.createElement('div');
  projectExplorerContainer.id = 'project-explorer-container';
  contentWrapper.appendChild(projectExplorerContainer);

  // Create search panel container inside content wrapper
  const searchPanelContainer = document.createElement('div');
  searchPanelContainer.id = 'search-panel-container';
  contentWrapper.appendChild(searchPanelContainer);

  // Create main editor container inside content wrapper
  const appContainer = document.createElement('div');
  appContainer.id = 'app';
  contentWrapper.appendChild(appContainer);

  // Create statusbar at the bottom
  const statusbarContainer = document.createElement('div');
  statusbarContainer.id = 'statusbar';
  app_container.appendChild(statusbarContainer);

  statusbar = new StatusBar('statusbar');

  // Initialize TabView
  tabView = new TabView('app', {
    defaultContent: '',
    maxTabs: 20,
    onTabChange: updateMenuState,
    onCursorChange: (line, col) => statusbar?.updateCursor(line, col),
    onSplitPaneFileOpen: (splitView, paneIndex) => openFileForSplitPane(splitView, paneIndex),
    onAskAI: (selectedText, fileType) => askAIAboutCode(selectedText, fileType)
  });

  // Initialize file explorer
  fileExplorer = new FileExplorer(fileExplorerContainer, {
    onFileOpen: (filepath) => openFileByPath(filepath)
  });

  // Initialize project explorer
  projectExplorer = new ProjectExplorer(projectExplorerContainer, {
    onFileOpen: (filepath) => openFileByPath(filepath),
    onProjectChange: (project) => {
      if (project) {
        console.log('Projekt geöffnet:', project.name);
        statusbar?.setProject(project.name);
      } else {
        console.log('Projekt geschlossen');
        statusbar?.setProject(null);
      }
    }
  });

  // Initialize search panel
  searchPanel = new SearchPanel(searchPanelContainer, {
    onFileOpen: (filepath, lineNumber) => openFileByPath(filepath, lineNumber),
    getSearchRoot: () => projectExplorer.getProject()?.rootPath || null
  });

  // Helper to hide all sidebar panels except one
  const hideSidebarPanels = (except) => {
    if (except !== 'explorer' && fileExplorer.isVisible()) fileExplorer.hide();
    if (except !== 'project' && projectExplorer.isVisible()) projectExplorer.hide();
    if (except !== 'search' && searchPanel.isVisible()) searchPanel.hide();
  };

  // Register sidebar actions
  sidebar.registerAction('Explorer', () => {
    hideSidebarPanels('explorer');
    fileExplorer.toggle();
  });

  sidebar.registerAction('Projekt', () => {
    hideSidebarPanels('project');
    projectExplorer.toggle();
  });

  sidebar.registerAction('Suchen', () => {
    hideSidebarPanels('search');
    searchPanel.toggle();
  });

  sidebar.registerAction('AI Fenster', () => {
    const existingAiTab = tabView.getAllTabs().find(t => t.type === 'ai');
    if (existingAiTab) {
      tabView.setActiveTab(existingAiTab.id);
    } else {
      tabView.createNewTab('AI Fenster', '', null, 'ai');
    }
    updateMenuState();
  });

  // Initialize Menu with TabView integration
  menu = new Menu(menuContainer, {
    // File menu handlers
    'menu-new': () => {
      const tabId = tabView.createNewTab(APP_CONFIG.DEFAULT_TAB_NAME, '', 'text');
      console.log('Created new tab:', tabId);
      updateMenuState();
    },
    'menu-open': () => {
      console.log('Open file clicked');
      openFileDialog();
    },
    'menu-save': () => {
      console.log('Save clicked');
      saveCurrentTab();
    },
    'menu-save-under': () => {
      saveAsCurrentTab();
    },
    'menu-close-file': () => {
      console.log('Close clicked');
      closeCurrentTab();
    },
    'menu-close-all': () => {
      console.log('Close All clicked');
      closeAllTabs();
    },
    'menu-quit': () => {
      console.log('Quit clicked');
      if (window.runtime) {
        checkUnsavedChanges(() => window.runtime.Quit());
      }
    },
    'menu-undo': editorMenuHandler('Undo', 'undo'),
    'menu-redo': editorMenuHandler('Redo', 'redo'),
    'menu-cut': editorMenuHandler('Cut', 'cut'),
    'menu-copy': editorMenuHandler('Copy', 'copy'),
    'menu-paste': editorMenuHandler('Paste', 'paste'),
    'menu-select-all': editorMenuHandler('Select All', 'selectAll'),
    'menu-search': editorMenuHandler('Search', 'openSearch'),
    'menu-replace': editorMenuHandler('Replace', 'openReplace'),
    'menu-goto-line': editorMenuHandler('Go to Line', 'goToLine'),

    // View menu handlers
    'menu-split-vertical': () => {
      const tabId = tabView.createNewTab('Split View', '', null, 'split');
      if (tabId) {
        const tab = tabView.getActiveTab();
        if (tab) tab.splitOrientation = 'vertical';
      }
      updateMenuState();
    },
    'menu-split-horizontal': () => {
      const tabId = tabView.createNewTab('Split View', '', null, 'split');
      if (tabId) {
        const tab = tabView.getActiveTab();
        if (tab) tab.splitOrientation = 'horizontal';
      }
      updateMenuState();
    },
    'menu-ai-panel': () => {
      const existingAiTab = tabView.getAllTabs().find(t => t.type === 'ai');
      if (existingAiTab) {
        tabView.setActiveTab(existingAiTab.id);
      } else {
        tabView.createNewTab('AI Fenster', '', null, 'ai');
      }
      updateMenuState();
    },
    'menu-terminal': () => {
      console.log('Terminal clicked');
      tabView.createNewTab('Terminal', '', null, 'terminal');
      updateMenuState();
    },
    'menu-preferences': () => {
      showApiKeyDialog();
    },
    // About menu handlers
    'menu-keyboard-shortcuts': () => {
      console.log('Keyboard shortcuts clicked');
      showKeyboardShortcuts();
    },
    'menu-web-test': () => {
      console.log('Web test clicked');
      // Implement web test
    },
    'menu-about': () => {
      console.log('About clicked');
      showAboutDialog();
    },

    // Generic click handler
    onItemClick: (itemId, config) => {
      console.log(`Menu item clicked: ${itemId}`, config);
    }
  });

  // Initialize Toolbar
  const toolbarContainer = document.getElementById('toolbar');
  toolbar = new Toolbar(toolbarContainer, {
    'close-app': () => {
      if (window.runtime) {
        checkUnsavedChanges(() => window.runtime.Quit());
      }
    },
    'new-file': () => {
      tabView.createNewTab(APP_CONFIG.DEFAULT_TAB_NAME, '', 'text');
      updateMenuState();
    },
    'open-file': () => openFileDialog(),
    'save-file': () => saveCurrentTab(),
    'undo': () => executeEditorCommand('undo'),
    'redo': () => executeEditorCommand('redo'),
    'cut': () => executeEditorCommand('cut'),
    'copy': () => executeEditorCommand('copy'),
    'paste': () => executeEditorCommand('paste'),
    'settings': () => showFontDialog()
  });

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Initial menu state update
  updateMenuState();

  // Setup periodic state checks
  setupStateWatcher();

  console.log('TabView and Menu initialized successfully');

  // Expose for debugging
  window.tabView = tabView;
  window.menu = menu;

  // Drag & Drop: Empfängt Events vom Go-Backend (app.go → runtime.EventsEmit).
  // Doppelte Deduplizierung: Sowohl Go als auch hier im Frontend wird
  // gefiltert, da Linux/WebKit Drop-Events mehrfach auslösen kann.
  // recentDrops speichert Pfade mit Zeitstempel und ignoriert
  // Wiederholungen innerhalb von 1 Sekunde.
  const recentDrops = new Map();
  // Cleanup alte Einträge alle 30 Sekunden (Memory Leak vermeiden)
  setInterval(() => {
    const now = Date.now();
    for (const [path, timestamp] of recentDrops) {
      if (now - timestamp > 5000) recentDrops.delete(path);
    }
  }, 30000);

  if (window.runtime?.EventsOn) {
    window.runtime.EventsOn('file-drop', (filepath) => {
      if (!filepath) return;
      const now = Date.now();
      if (recentDrops.has(filepath) && now - recentDrops.get(filepath) < 1000) {
        return; // Duplikat ignorieren
      }
      recentDrops.set(filepath, now);

      // Split-View: Datei in die zuletzt überfahrene Pane laden
      const activeTab = tabView?.getActiveTab();
      if (activeTab?.type === 'split') {
        const splitView = tabView.splitViews?.get(activeTab.id);
        if (splitView && splitView.lastDragOverPaneIndex != null) {
          openFileForSplitPaneByPath(splitView, splitView.lastDragOverPaneIndex, filepath);
          splitView.lastDragOverPaneIndex = null;
          return;
        }
      }

      openFileByPath(filepath);
    });
  }

  // Dateien von der Befehlszeile öffnen
  openStartupFiles();
});

function editorMenuHandler(label, cmd) {
  return () => {
    console.log(label + ' clicked');
    executeEditorCommand(cmd);
  };
}

// ========== TAB-VERWALTUNG ==========

// updateMenuState synchronisiert den Zustand der Menü- und Toolbar-Buttons
// mit dem aktuellen Zustand der Tabs. Wird aufgerufen bei:
//   - Tab-Wechsel, Tab-Erstellung, Tab-Schließung
//   - Datei speichern/öffnen
//   - Periodisch alle 1 Sekunde (setupStateWatcher)
// Beispiel: "Speichern" ist nur aktiv, wenn ein Tab geändert wurde.
function updateMenuState() {
  const activeTab = tabView?.getActiveTab();
  const hasTabs = tabView?.count() > 0;
  const hasMoreTabs = tabView?.count() > 1;
  const hasModifiedTabs = tabView?.getAllTabs().some(tab => tab.isModified) || false;

  // Update window title
  if (activeTab) {
    const title = activeTab.getDisplayTitle();
    document.title = `${title} - Code Editor`;
  }

  // Update save buttons state
  if (menu) {
    // Enable/disable save buttons based on modifications
    menu.setItemEnabled('menu-save', hasModifiedTabs);
    menu.setItemEnabled('menu-save-under', hasModifiedTabs);

    // Enable/disable close buttons based on tabs
    menu.setItemEnabled('menu-close-file', hasTabs);
    menu.setItemEnabled('menu-close-all', hasMoreTabs);

    // Enable/disable edit menu items based on active editor (disabled for AI/terminal tabs)
    const hasActiveEditor = activeTab !== null && activeTab.type !== 'ai' && activeTab.type !== 'terminal';
    menu.setItemEnabled('menu-undo', hasActiveEditor);
    menu.setItemEnabled('menu-redo', hasActiveEditor);
    menu.setItemEnabled('menu-cut', hasActiveEditor);
    menu.setItemEnabled('menu-copy', hasActiveEditor);
    menu.setItemEnabled('menu-paste', hasActiveEditor);
    menu.setItemEnabled('menu-select-all', hasActiveEditor);
    menu.setItemEnabled('menu-search', hasActiveEditor);
    menu.setItemEnabled('menu-replace', hasActiveEditor);
    menu.setItemEnabled('menu-goto-line', hasActiveEditor);
  }

  if (toolbar) {
    toolbar.setButtonEnabled('save-file', hasModifiedTabs);
    const isEditorTab = activeTab !== null && activeTab.type !== 'ai' && activeTab.type !== 'terminal';
    toolbar.setButtonEnabled('undo', isEditorTab);
    toolbar.setButtonEnabled('redo', isEditorTab);
  }

  if (statusbar) {
    if (activeTab) {
      if (activeTab.type === 'split') {
        // Split-View: Statusbar der fokussierten Pane anzeigen
        const splitView = tabView.splitViews?.get(activeTab.id);
        if (splitView) {
          const editor = splitView.getFocusedEditor();
          const pane = splitView.getFocusedPane();
          const pos = editor?.getCursorPosition() || { line: 1, col: 1 };
          statusbar.update({
            line: pos.line,
            col: pos.col,
            language: pane?.type || 'Text',
            filepath: pane?.path || '',
            status: splitView.isModified() ? STATUS_MESSAGES.CHANGED : STATUS_MESSAGES.READY
          });
        }
      } else {
        const editor = tabView.editors?.get(activeTab.id);
        const pos = editor?.getCursorPosition() || { line: 1, col: 1 };
        statusbar.update({
          line: pos.line,
          col: pos.col,
          language: activeTab.type || 'Text',
          filepath: activeTab.path || '',
          status: activeTab.isModified ? STATUS_MESSAGES.CHANGED : STATUS_MESSAGES.READY
        });
      }
    } else {
      statusbar.clear();
    }
  }
}

function closeCurrentTab() {
  const activeTab = tabView?.getActiveTab();
  if (activeTab) {
    // Check for unsaved changes
    if (activeTab.isModified) {
      if (!confirm(`"${activeTab.title}" has unsaved changes. Close anyway?`)) {
        return false;
      }
    }
    return tabView.closeTab(activeTab.id);
  }
  return false;
}

function closeAllTabs() {
  const tabs = tabView?.getAllTabs() || [];
  const modifiedTabs = tabs.filter(tab => tab.isModified);

  if (modifiedTabs.length > 0) {
    if (!confirm(`${modifiedTabs.length} tab(s) have unsaved changes. Close all anyway?`)) {
      return false;
    }
  }

  // Close all tabs one by one
  tabs.forEach(tab => {
    tabView.closeTab(tab.id);
  });

  return true;
}

function checkUnsavedChanges(callback) {
  const modifiedTabs = tabView?.getAllTabs().filter(tab => tab.isModified) || [];

  if (modifiedTabs.length === 0) {
    callback();
    return;
  }

  const tabNames = modifiedTabs.map(tab => `"${tab.title}"`).join(', ');
  if (confirm(`${modifiedTabs.length} tab(s) have unsaved changes (${tabNames}). Quit anyway?`)) {
    callback();
  }
}

// ========== EDITOR-BEFEHLE ==========

// executeEditorCommand leitet einen Befehl an den aktiven CodeMirror-Editor weiter.
// Die Befehle (undo, redo, cut, copy, paste, selectAll, openSearch, etc.)
// sind als Methoden in der CodeEditor-Klasse (editor.js) implementiert.
function executeEditorCommand(command) {
  const activeTab = tabView?.getActiveTab();
  if (!activeTab) return;

  // Split-View: Befehl an fokussierte Pane delegieren
  if (activeTab.type === 'split') {
    const splitView = tabView.splitViews?.get(activeTab.id);
    if (!splitView) return;
    const editor = splitView.getFocusedEditor();
    if (editor) editor[command]?.();
    return;
  }

  const editor = tabView.editors?.get(activeTab.id);
  if (!editor) return;

  editor[command]?.();
}

// ========== DATEIOPERATIONEN ==========
// Diese Funktionen rufen Go-Backend-Methoden über Wails-Bindings auf:
//   LoadFile()      → Go: Öffnen-Dialog → gibt {content, filename, error} zurück
//   SaveFile()      → Go: Speichert Inhalt in Datei
//   SaveFileUnder() → Go: Speichern-unter-Dialog → gibt {success, path, title} zurück
//   ReadTextFile()  → Go: Liest Textdatei ohne Dialog
//   ReadBinaryFile()→ Go: Liest Binärdatei als Base64 (für Bilder/PDFs)

// openStartupFiles öffnet Dateien, die per Kommandozeile übergeben wurden.
async function openStartupFiles() {
  try {
    const files = await GetStartupFiles();
    if (!files || files.length === 0) return;

    for (const filepath of files) {
      await openFileByPath(filepath);
    }
  } catch (error) {
    console.error('Startup files failed:', error);
  }
}

// openFileByPath öffnet eine Datei anhand ihres Pfades in einem neuen Tab.
// Ablauf: Dateityp erkennen → passende Lesemethode wählen → Tab erstellen.
// Bilder und PDFs werden als Base64-Data-URIs geladen (ReadBinaryFile),
// alle anderen Dateien als Text (ReadTextFile).
async function openFileByPath(filepath, lineNumber = null) {
  try {
    const type = getFileType(filepath);
    const name = getFilenameFromPath(filepath) || APP_CONFIG.DEFAULT_TAB_NAME;

    if (type === 'image') {
      const binary = await ReadBinaryFile(filepath);
      if (binary.error) {
        console.error('Bild konnte nicht geladen werden:', binary.error);
        return;
      }
      const dataUri = `data:${binary.mimeType};base64,${binary.data}`;
      tabView.createNewTab(name, dataUri, filepath, 'image');
    } else if (type === 'pdf') {
      const binary = await ReadBinaryFile(filepath);
      if (binary.error) {
        console.error('PDF konnte nicht geladen werden:', binary.error);
        return;
      }
      const dataUri = `data:${binary.mimeType};base64,${binary.data}`;
      tabView.createNewTab(name, dataUri, filepath, 'pdf');
    } else {
      const fileData = await ReadTextFile(filepath);
      if (fileData.error) {
        console.error('Datei konnte nicht geladen werden:', fileData.error);
        return;
      }
      tabView.createNewTab(name, fileData.content, filepath, type);

      // Nach dem Öffnen zur Zeile springen (falls angegeben)
      if (lineNumber) {
        // Kurz warten bis der Editor initialisiert ist
        requestAnimationFrame(() => {
          tabView.scrollToLine(lineNumber);
        });
      }
    }

    updateMenuState();
  } catch (error) {
    console.error('Open file by path failed:', error);
  }
}

async function openFileDialog() {

  try {
    const fileData = await LoadFile();
    if (!fileData || fileData.error) return false;

    const filename = fileData.filename;
    const type = getFileType(filename);
    const name = getFilenameFromPath(filename) || APP_CONFIG.DEFAULT_TAB_NAME;

    if (type === 'image') {
      // Binärdatei über Go als Base64 laden
      const binary = await ReadBinaryFile(filename);
      if (binary.error) {
        alert('Bild konnte nicht geladen werden: ' + binary.error);
        return false;
      }
      const dataUri = `data:${binary.mimeType};base64,${binary.data}`;
      tabView.createNewTab(name, dataUri, filename, 'image');
    } else if (type === 'pdf') {
      // PDF-Datei ebenfalls als Binärdatei laden
      const binary = await ReadBinaryFile(filename);
      if (binary.error) {
        alert('PDF konnte nicht geladen werden: ' + binary.error);
        return false;
      }
      const dataUri = `data:${binary.mimeType};base64,${binary.data}`;
      tabView.createNewTab(name, dataUri, filename, 'pdf');
    } else {
      tabView.createNewTab(name, fileData.content, filename, type);
    }

    updateMenuState();
    return true;
  } catch (error) {
    console.error('Open file failed:', error);
    alert('Failed to open file: ' + error.message);
  }

  return false;
}

async function saveCurrentTab() {
  const activeTab = tabView?.getActiveTab();

  if (!activeTab) return false;

  // Split-View: fokussierte Pane speichern
  if (activeTab.type === 'split') {
    return await saveSplitPane();
  }

  // Neue Datei ohne Pfad → "Speichern unter"-Dialog
  if (!activeTab.path) {
    return await saveAsCurrentTab();
  }

  try {
    const result = await SaveFile(activeTab.content, activeTab.path);
    console.log(result);

    tabView.updateTab(activeTab.id, {
      path: activeTab.path,
      title: activeTab.title, // No title change since we're saving to the same path
      isModified: false
    });
    updateMenuState();
    return true;

  } catch (error) {
    console.error('Save failed:', error);
    alert('Failed to save file: ' + error.message);
  }

  return false;
}

async function saveAsCurrentTab() {
  const activeTab = tabView?.getActiveTab();
  if (!activeTab) return false;

  // Split-View: fokussierte Pane "Speichern unter"
  if (activeTab.type === 'split') {
    return await saveSplitPaneAs();
  }

  try {
    // PASS OBJECT DIRECTLY (NO JSON.stringify!)
    const result = await SaveFileUnder(JSON.stringify({
      content: activeTab.content,
      defaultPath: activeTab.path || activeTab.title
    }));

    if (result.success && result.path) {
      tabView.updateTab(activeTab.id, {
        path: result.path,
        title: result.title || activeTab.title, // Uses clean basename from Go
        isModified: false
      });
      updateMenuState();
      return true;
    }

    // Show alert ONLY for actual errors (not user cancel)
    if (result.error) {
      console.error('Save As failed:', result.error);
      alert(`Speichern fehlgeschlagen: ${result.error}`);
    }

    return false; // Handles cancel + non-alert errors

  } catch (error) {
    // Catches Wails/runtime exceptions (panics, binding errors, etc.)
    console.error('Save As exception:', error);
    alert(`Kritischer Fehler: ${error.message || String(error)}`);
    return false;
  }
}

// ========== SPLIT-VIEW DATEIOPERATIONEN ==========

async function openFileForSplitPane(splitView, paneIndex) {
  try {
    const fileData = await LoadFile();
    if (!fileData || fileData.error) return false;

    const filename = fileData.filename;
    const type = getFileType(filename);
    const name = getFilenameFromPath(filename) || APP_CONFIG.DEFAULT_TAB_NAME;

    if (type === 'image' || type === 'pdf') {
      alert('Bilder und PDFs können nicht in Split-Panes geöffnet werden.');
      return false;
    }

    splitView.loadFileInPane(paneIndex, name, fileData.content, type, filename);
    updateMenuState();
    return true;
  } catch (error) {
    console.error('Open file for split pane failed:', error);
    return false;
  }
}

async function openFileForSplitPaneByPath(splitView, paneIndex, filepath) {
  try {
    const type = getFileType(filepath);
    const name = getFilenameFromPath(filepath) || APP_CONFIG.DEFAULT_TAB_NAME;

    if (type === 'image' || type === 'pdf') {
      return;
    }

    const fileData = await ReadTextFile(filepath);
    if (fileData.error) {
      console.error('Datei konnte nicht geladen werden:', fileData.error);
      return;
    }

    splitView.loadFileInPane(paneIndex, name, fileData.content, type, filepath);
    updateMenuState();
  } catch (error) {
    console.error('Open file by path for split pane failed:', error);
  }
}

async function saveSplitPane() {
  const activeTab = tabView?.getActiveTab();
  const splitView = tabView.splitViews?.get(activeTab?.id);
  if (!splitView) return false;

  const paneData = splitView.getFocusedPaneData();
  if (!paneData.isModified) return false;

  if (!paneData.path) {
    return await saveSplitPaneAs();
  }

  try {
    await SaveFile(paneData.content, paneData.path);
    splitView.markFocusedPaneSaved(paneData.path, paneData.title);
    updateMenuState();
    return true;
  } catch (error) {
    console.error('Save split pane failed:', error);
    alert('Speichern fehlgeschlagen: ' + error.message);
    return false;
  }
}

async function saveSplitPaneAs() {
  const activeTab = tabView?.getActiveTab();
  const splitView = tabView.splitViews?.get(activeTab?.id);
  if (!splitView) return false;

  const paneData = splitView.getFocusedPaneData();

  try {
    const result = await SaveFileUnder(JSON.stringify({
      content: paneData.content,
      defaultPath: paneData.path || paneData.title || 'Unbenannt.txt'
    }));

    if (result.success && result.path) {
      splitView.markFocusedPaneSaved(result.path, result.title || paneData.title);
      updateMenuState();
      return true;
    }

    if (result.error) {
      alert(`Speichern fehlgeschlagen: ${result.error}`);
    }
    return false;
  } catch (error) {
    console.error('Save As split pane exception:', error);
    alert(`Kritischer Fehler: ${error.message || String(error)}`);
    return false;
  }
}

// ========== KEYBOARD SHORTCUTS ==========
// isMac: Synchrone Prüfung für Tastenkürzel (Cmd vs Ctrl)
// Verwendet navigator.platform für synchronen Zugriff
function isMac() {
  // navigator.platform ist synchron und ausreichend für Tastenkürzel-Logik
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Skip if user is typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const onMac = isMac();
    const ctrlKey = onMac ? e.metaKey : e.ctrlKey;

    if ((ctrlKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          menu?.options['menu-new']?.();
          break;
        case 'o':
          e.preventDefault();
          menu?.options['menu-open']?.();
          break;
        case 's':
          e.preventDefault();
          console.log("saving");
          saveCurrentTab();
          break;
        case 'w':
          e.preventDefault();
          closeCurrentTab();
          break;
        case 'q':
          e.preventDefault();
          menu?.options['menu-quit']?.();
          break;
        case 'h':
          e.preventDefault();
          executeEditorCommand('openReplace');
          break;
        case 'g':
          e.preventDefault();
          executeEditorCommand('goToLine');
          break;
        case 'tab':
          e.preventDefault();
          if (tabView) {
            const tabs = tabView.getAllTabs();
            if (tabs.length > 1) {
              const activeTab = tabView.getActiveTab();
              const currentIndex = tabs.findIndex(t => t.id === activeTab?.id);
              const nextIndex = (currentIndex + 1) % tabs.length;
              tabView.setActiveTab(tabs[nextIndex].id);
            }
          }
          break;
      }
    } else if (ctrlKey && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          menu?.options['menu-save-under']?.();
          break;
        case 'tab':
          e.preventDefault();
          if (tabView) {
            const tabs = tabView.getAllTabs();
            if (tabs.length > 1) {
              const activeTab = tabView.getActiveTab();
              const currentIndex = tabs.findIndex(t => t.id === activeTab?.id);
              const nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              tabView.setActiveTab(tabs[nextIndex].id);
            }
          }
          break;
        case 'w':
          e.preventDefault();
          closeAllTabs();
          break;
      }
    }

    // Escape key closes menus
    if (e.key === 'Escape') {
      menu?.closeAllSubmenus();
    }
  });
}

// ========== HELPER FUNCTIONS ==========

// askAIAboutCode öffnet das AI-Panel und fügt den ausgewählten Code ein
function askAIAboutCode(selectedText, fileType) {
  // AI-Tab finden oder erstellen
  let aiTab = tabView.getAllTabs().find(t => t.type === 'ai');
  let aiTabId;

  if (aiTab) {
    aiTabId = aiTab.id;
    tabView.setActiveTab(aiTabId);
  } else {
    aiTabId = tabView.createNewTab('AI Fenster', '', null, 'ai');
  }

  // Kurz warten bis AI-Panel initialisiert ist
  setTimeout(() => {
    const aiPanel = tabView.aiPanels.get(aiTabId);
    if (aiPanel) {
      // Prompt mit Code-Block erstellen
      const langHint = fileType || 'code';
      const prompt = `Erkläre diesen ${langHint} Code:\n\n\`\`\`${langHint}\n${selectedText}\n\`\`\``;

      // Prompt-Input finden und befüllen
      const promptInput = aiPanel.panel?.querySelector('.prompt-input');
      if (promptInput) {
        promptInput.value = prompt;
        promptInput.focus();
      }
    }
  }, 100);

  updateMenuState();
}

function setupStateWatcher() {
  // Update menu state periodically
  setInterval(updateMenuState, 1000);
}

function showKeyboardShortcuts() {
  const shortcuts = [
    ['Ctrl+N', 'New file'],
    ['Ctrl+O', 'Open file'],
    ['Ctrl+S', 'Save'],
    ['Ctrl+Shift+S', 'Save As'],
    ['Ctrl+W', 'Close tab'],
    ['Ctrl+Shift+W', 'Close all tabs'],
    ['Ctrl+Tab', 'Next tab'],
    ['Ctrl+Shift+Tab', 'Previous tab'],
    ['Ctrl+Q', 'Quit'],
    ['Ctrl+A', 'Select all'],
    ['Ctrl+Z', 'Undo'],
    ['Ctrl+Y', 'Redo'],
    ['Ctrl+X', 'Cut'],
    ['Ctrl+C', 'Copy'],
    ['Ctrl+V', 'Paste'],
    ['Ctrl+F', 'Search'],
    ['Ctrl+H', 'Replace'],
    ['Ctrl+G', 'Go to line'],
    ['Esc', 'Close menu / panel']
  ];

  const html = `
    <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h2 style="margin-top: 0;">Keyboard Shortcuts</h2>
      <table style="border-collapse: collapse; width: 100%;">
        ${shortcuts.map(([key, action]) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; width: 40%;">
              <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${key}</code>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${action}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;

  alertDialog('Keyboard Shortcuts', html);
}

function alertDialog(title, content) {
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    min-width: 300px;
    max-width: 500px;
    overflow: hidden;
  `;

  const titleBar = document.createElement('div');
  titleBar.style.cssText = 'background: #2d3748; color: white; padding: 15px 20px; font-weight: bold;';

  const titleText = document.createElement('span');
  titleText.textContent = title;
  titleBar.appendChild(titleText);

  const closeButton = document.createElement('button');
  closeButton.style.cssText = 'float: right; background: none; border: none; color: white; cursor: pointer;';
  closeButton.textContent = '\u00d7';
  titleBar.appendChild(closeButton);

  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = content;

  dialog.appendChild(titleBar);
  dialog.appendChild(contentDiv);

  // Add close button handler
  closeButton.onclick = () => {
    document.body.removeChild(backdrop);
    document.body.removeChild(dialog);
  };

  // Add backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;
  backdrop.onclick = () => {
    document.body.removeChild(backdrop);
    document.body.removeChild(dialog);
  };

  document.body.appendChild(backdrop);
  document.body.appendChild(dialog);
}