// menu.js — Hierarchische Menüleiste (Datei, Bearbeiten, Ansicht, Über).
// Baut die gesamte Menü-UI programmatisch im DOM auf (kein HTML-Template).
//
// Aufbau:
//   <nav class="menubar">                  ← Horizontale Leiste
//     <div class="menu-item">Datei         ← Hauptmenüpunkt
//       <div class="submenu">              ← Dropdown-Untermenü
//         <div class="submenu-item">...</div>
//       </div>
//     </div>
//   </nav>
//
// Die Menü-Aktionen werden als Callback-Objekt übergeben (z.B. {'menu-save': () => ...}).
// Menüpunkte können per setItemEnabled(id, boolean) aktiviert/deaktiviert werden.

// SVG-Icons als Inline-Strings für die Menüeinträge
const iconData = {
  'FileText': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-file-description"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 2l.117 .007a1 1 0 0 1 .876 .876l.007 .117v4l.005 .15a2 2 0 0 0 1.838 1.844l.157 .006h4l.117 .007a1 1 0 0 1 .876 .876l.007 .117v9a3 3 0 0 1 -2.824 2.995l-.176 .005h-10a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-14a3 3 0 0 1 2.824 -2.995l.176 -.005zm3 14h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0 -2m0 -4h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0 -2" /><path d="M19 7h-4l-.001 -4.001z" /></svg>',
  'FolderOpen': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-folder-open"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 13v-8a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-5.5m-9.5 -2h7m-3 -3l3 3l-3 3" /></svg>',
  'RotateCcw':'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-rotate-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 4.55a8 8 0 0 0 -6 14.9m0 -4.45v5h-5" /><path d="M18.37 7.16l0 .01" /><path d="M13 19.94l0 .01" /><path d="M16.84 18.37l0 .01" /><path d="M19.37 15.1l0 .01" /><path d="M19.94 11l0 .01" /></svg>',
  'RotateCw': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-rotate-clockwise-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 4.55a8 8 0 0 1 6 14.9m0 -4.45v5h5" /><path d="M5.63 7.16l0 .01" /><path d="M4.06 11l0 .01" /><path d="M4.63 15.1l0 .01" /><path d="M7.16 18.37l0 .01" /><path d="M11 19.94l0 .01" /></svg>',
  'Scissors': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-scissors"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 7a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M8.6 8.6l10.4 10.4" /><path d="M8.6 15.4l10.4 -10.4" /></svg>',
  'Copy': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-copy"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg>',
  'BoxSelect': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-select-all"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -6" /><path d="M12 20v.01" /><path d="M16 20v.01" /><path d="M8 20v.01" /><path d="M4 20v.01" /><path d="M4 16v.01" /><path d="M4 12v.01" /><path d="M4 8v.01" /><path d="M4 4v.01" /><path d="M8 4v.01" /><path d="M12 4v.01" /><path d="M16 4v.01" /><path d="M20 4v.01" /><path d="M20 8v.01" /><path d="M20 12v.01" /><path d="M20 16v.01" /><path d="M20 20v.01" /></svg>',
  'Clipboard': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-clipboard-plus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2" /><path d="M10 14h4" /><path d="M12 12v4" /></svg>',
  'HelpCircle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-help"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 17l0 .01" /><path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4" /></svg>',
  'LogOut': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-logout"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></svg>',
  'SquareX': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-square-letter-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14" /><path d="M10 8l4 8" /><path d="M10 16l4 -8" /></svg>',
  'Save':'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-device-floppy"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2" /><path d="M10 14a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M14 4l0 4l-6 0l0 -4" /></svg>',
  'Sparkles': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-sparkles-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M13 7a9.3 9.3 0 0 0 1.516 -.546c.911 -.438 1.494 -1.015 1.937 -1.932c.207 -.428 .382 -.928 .547 -1.522c.165 .595 .34 1.095 .547 1.521c.443 .918 1.026 1.495 1.937 1.933c.426 .205 .925 .38 1.516 .546a9.3 9.3 0 0 0 -1.516 .547c-.911 .438 -1.494 1.015 -1.937 1.932a9 9 0 0 0 -.547 1.521c-.165 -.594 -.34 -1.095 -.547 -1.521c-.443 -.918 -1.026 -1.494 -1.937 -1.932a9 9 0 0 0 -1.516 -.547" /><path d="M3 14a21 21 0 0 0 1.652 -.532c2.542 -.953 3.853 -2.238 4.816 -4.806a20 20 0 0 0 .532 -1.662a20 20 0 0 0 .532 1.662c.963 2.567 2.275 3.853 4.816 4.806q .75 .28 1.652 .532a21 21 0 0 0 -1.652 .532c-2.542 .953 -3.854 2.238 -4.816 4.806a20 20 0 0 0 -.532 1.662a20 20 0 0 0 -.532 -1.662c-.963 -2.568 -2.275 -3.853 -4.816 -4.806a21 21 0 0 0 -1.652 -.532" /></svg>',
  'Search': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-search"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>',
  'Replace': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-replace"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 3m0 2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2z" /><path d="M13 13m0 2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2z" /><path d="M11 7h3a2 2 0 0 1 2 2v3" /><path d="M13 7l-3 -3" /><path d="M13 7l-3 3" /></svg>',
  'Hash': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-hash"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 9l14 0" /><path d="M5 15l14 0" /><path d="M11 4l-2 16" /><path d="M15 4l-2 16" /></svg>',
  'SplitVertical': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
  'SplitHorizontal': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
  'Terminal': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-terminal-icon lucide-file-terminal"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="m8 16 2-2-2-2"/><path d="M12 18h4"/></svg>',
};

export class Menu {
  // container: DOM-Element, in das die Menüleiste eingefügt wird
  // options: Objekt mit Callbacks, Schlüssel = Menüpunkt-ID (z.B. 'menu-save')
  //          Spezielle Keys: onClose, onItemClick (generischer Handler)
  constructor(container, options = {}) {
    this.container = container
    this.options = {
      onClose: options.onClose || null,
      onItemClick: options.onItemClick || null,
      ...options
    }

    this.activeMenuItem = null  // Aktuell geöffneter Hauptmenüpunkt
    this.isMenuOpen = false     // Ob ein Untermenü sichtbar ist

    this.init()
  }
  
  init() {
    // Create menu container
    this.element = document.createElement('nav')
    this.element.id = 'menubar'
    this.element.className = 'menubar'
    this.element.setAttribute('role', 'menubar')
    this.element.setAttribute('aria-label', 'Anwendungsmenü')
    
    // Create menu items
    this.menuItems = [
      this.createFileMenu(),
      this.createEditMenu(),
      this.createViewMenu(),
      this.createSettingsMenu(),
      this.createAboutMenu()
    ]
    
    this.menuItems.forEach(item => {
      this.element.appendChild(item.element)
    })
    
    // Append to container
    this.container.appendChild(this.element)
    
    // Close submenus when mouse leaves the menubar
    this.element.addEventListener('mouseleave', () => {
      this.closeAllSubmenus()
    })

    // Setup event listeners
    this.setupEventListeners()
  }

  setupEventListeners() {
    // ✅ Handle clicks on menu items (event delegation)
    this.element.addEventListener('click', (e) => {
      const item = e.target.closest('[role="menuitem"]');
      //console.log('Menu item clicked:', item);
      if (!item) return; // Not a menu item
      
      // ✅ Check CURRENT disabled state (not cached)
      if (item.getAttribute('aria-disabled') === 'true' || 
          item.classList.contains('disabled')) {
        e.preventDefault();
        e.stopPropagation();
        return; // Ignore disabled items
      }
      
      // ✅ Handle the click
      this.handleMenuItemClick(item, e);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.closeAllSubmenus();
      }
    });
    
    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllSubmenus();
      }
    });
  }
  
  closeAllSubmenus() {
    this.menuItems.forEach(item => item.close())
    this.isMenuOpen = false
  }
  
  // ========== FILE MENU ==========
  createFileMenu() {
    const menuItem = this.createMenuItem('Datei')
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-new',
      icon: iconData['FileText'],
      label: 'Neu',
      shortcut: null,
      disabled: false
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-open',
      icon: iconData['FolderOpen'],
      label: 'Öffnen',
      shortcut: null,
      disabled: false
    })
    
    this.addSeparator(menuItem)
    
    // this.addSubmenuItem(menuItem, {
    //   id: 'menu-open-left',
    //   icon: PanelLeft,
    //   label: 'In linken Tab öffnen',
    //   shortcut: null,
    //   disabled: true
    // })
    
    // this.addSubmenuItem(menuItem, {
    //   id: 'menu-open-right',
    //   icon: PanelRight,
    //   label: 'In rechten Tab öffnen',
    //   shortcut: null,
    //   disabled: true
    // })
    
    // this.addSeparator(menuItem)
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-save',
      icon: iconData['Save'],
      label: 'Speichern',
      shortcut: 'Strg+S',
      disabled: false
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-save-under',
      icon: iconData['Save'],
      label: 'Speichern unter',
      shortcut: 'Strg+Shift+S',
      disabled: false
    })
    
    this.addSeparator(menuItem)
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-close-file',
      icon: iconData['SquareX'],
      label: 'Schließen',
      shortcut: null,
      disabled: true
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-close-all',
      icon: iconData['SquareX'],
      label: 'Alle schließen',
      shortcut: null,
      disabled: false
    })
    
    this.addSeparator(menuItem)
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-quit',
      icon: iconData['LogOut'],
      label: 'Beenden',
      shortcut: 'Strg+Q',
      disabled: false
    })    
    
    return menuItem
  }
  
  // ========== EDIT MENU ==========
  createEditMenu() {
    const menuItem = this.createMenuItem('Bearbeiten')
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-undo',
      icon: iconData['RotateCcw'],
      label: 'Rückgängig',
      shortcut: null,
      disabled: true
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-redo',
      icon: iconData['RotateCw'],
      label: 'Wiederholen',
      shortcut: null,
      disabled: true
    })
    
    this.addSeparator(menuItem)
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-cut',
      icon: iconData['Scissors'],
      label: 'Ausschneiden',
      shortcut: null,
      disabled: true
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-copy',
      icon: iconData['Copy'],
      label: 'Kopieren',
      shortcut: null,
      disabled: true
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-paste',
      icon: iconData['Clipboard'],
      label: 'Einfügen',
      shortcut: null,
      disabled: true
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-select-all',
      icon: iconData['BoxSelect'],
      label: 'Alles auswählen',
      shortcut: 'Strg+A',
      disabled: true
    })
    
    this.addSeparator(menuItem)

    this.addSubmenuItem(menuItem, {
      id: 'menu-search',
      icon: iconData['Search'],
      label: 'Suchen',
      shortcut: 'Strg+F',
      disabled: true
    })

    this.addSubmenuItem(menuItem, {
      id: 'menu-replace',
      icon: iconData['Replace'],
      label: 'Ersetzen',
      shortcut: 'Strg+H',
      disabled: true
    })

    this.addSeparator(menuItem)

    this.addSubmenuItem(menuItem, {
      id: 'menu-goto-line',
      icon: iconData['Hash'],
      label: 'Gehe zu Zeile...',
      shortcut: 'Strg+G',
      disabled: true
    })

    return menuItem
  }
  
  // ========== VIEW MENU ==========
  createViewMenu() {
    const menuItem = this.createMenuItem('Ansicht')

    this.addSubmenuItem(menuItem, {
      id: 'menu-split-vertical',
      icon: iconData['SplitVertical'],
      label: 'Split Vertikal',
      shortcut: null,
      disabled: false
    })

    this.addSubmenuItem(menuItem, {
      id: 'menu-split-horizontal',
      icon: iconData['SplitHorizontal'],
      label: 'Split Horizontal',
      shortcut: null,
      disabled: false
    })

    this.addSeparator(menuItem)

    this.addSubmenuItem(menuItem, {
      id: 'menu-ai-panel',
      icon: iconData['Sparkles'],
      label: 'AI Fenster',
      shortcut: null,
      disabled: false
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-terminal',
      icon: iconData['Terminal'],
      label: 'Terminal',
      shortcut: 'Ctrl+`',
      disabled: false
    })
    
    // this.addSeparator(menuItem)
    
    // this.addSubmenuItem(menuItem, {
    //   id: 'menu-font-settings',
    //   icon: Type,
    //   label: 'Schriftart...',
    //   shortcut: null,
    //   disabled: false
    // })
    
    // this.addSubmenuItem(menuItem, {
    //   id: 'menu-api-key',
    //   icon: Key,
    //   label: 'openrouter API Key...',
    //   shortcut: null,
    //   disabled: false
    // })
    
    return menuItem
  }

  // ========== EINSTELLUNGEN MENU ==========
  createSettingsMenu(){
    const menuItem = this.createMenuItem('Einstellungen')

    this.addSubmenuItem(menuItem, {
      id: 'menu-preferences',
      icon: iconData['Sparkles'],
      label: 'Set Openrouter API Key',
      shortcut: null,
      disabled: false
    })

    return menuItem
  }
  // ========== ABOUT MENU ==========
  createAboutMenu() {
    const menuItem = this.createMenuItem('Über')
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-keyboard-shortcuts',
      icon: iconData['HelpCircle'],
      label: 'Tastenkürzel',
      shortcut: null,
      disabled: false
    })
    
    this.addSubmenuItem(menuItem, {
      id: 'menu-about',
      icon: iconData['HelpCircle'],
      label: 'Über Leoedit',
      shortcut: null,
      disabled: false
    })
    
    return menuItem
  }
  
  // ========== HILFSMETHODEN ==========

  // createMenuItem erstellt einen Hauptmenüpunkt (z.B. "Datei") mit
  // leerem Untermenü. Gibt ein Objekt zurück: { element, submenu, close() }
  // Das Untermenü wird per addSubmenuItem() befüllt.
  createMenuItem(label) {
    const element = document.createElement('div')
    element.className = 'menu-item'
    element.setAttribute('tabindex', '0')
    element.setAttribute('role', 'menuitem')
    element.textContent = label

    const submenu = document.createElement('div')
    submenu.className = 'submenu'
    submenu.setAttribute('role', 'menu')
    submenu.setAttribute('aria-label', `${label} Menü`)

    element.appendChild(submenu)
    
    // Hover to open submenu
    element.addEventListener('mouseenter', () => {
      this.closeAllSubmenus()
      element.classList.add('active')
      submenu.style.display = 'block'
      this.activeMenuItem = element
      this.isMenuOpen = true
    })
    
    // Click to toggle submenu
    element.addEventListener('click', (e) => {
      e.stopPropagation()
      if (submenu.style.display === 'block') {
        this.closeAllSubmenus()
      } else {
        this.closeAllSubmenus()
        element.classList.add('active')
        submenu.style.display = 'block'
        this.activeMenuItem = element
        this.isMenuOpen = true
      }
    })
    
    // Keyboard navigation
    element.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const firstItem = submenu.querySelector('.submenu-item:not([aria-disabled="true"])')
        if (firstItem) firstItem.focus()
      }
    })
    
    return {
      element,
      submenu,
      close: () => {
        element.classList.remove('active')
        submenu.style.display = 'none'
      }
    }
  }
  
  // addSubmenuItem fügt einen Eintrag zum Untermenü hinzu.
  // config: { id, icon, label, shortcut, disabled }
  // Der Klick-Handler ruft this.options[config.id]() auf — also den
  // Callback, der beim Erstellen der Menu-Instanz übergeben wurde.
  addSubmenuItem(parent, config) {
    const item = document.createElement('div')
    item.className = 'submenu-item'
    item.id = config.id
    item.setAttribute('role', 'menuitem')
    if (config.disabled) {
      item.setAttribute('aria-disabled', 'true')
    }
    
    // Create icon
    const iconSpan = document.createElement('span')
    iconSpan.className = 'menu-icon'
    
    if (config.icon) {
       //const iconSVG = config.icon({ size: 16, strokeWidth: 1.5 })
       iconSpan.innerHTML = config.icon;
    }
    
    // Create label
    const labelSpan = document.createElement('span')
    labelSpan.className = 'menu-label'
    labelSpan.textContent = config.label
      
    item.appendChild(iconSpan)
    item.appendChild(labelSpan)
  
      // Create shortcut (if any)
    if (config.shortcut) {
      const shortcutSpan = document.createElement('span')
      shortcutSpan.className = 'menu-shortcut'
      shortcutSpan.textContent = config.shortcut
      item.appendChild(shortcutSpan)
    }
    
    // Click handler
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      if (item.getAttribute('aria-disabled') !== 'true') {
        this.options.onItemClick?.(config.id, config)
        if (this.options[config.id]) {
          this.options[config.id]()
        }
        // Close all submenus after item selection
        this.closeAllSubmenus()
      }
    })

    // Keyboard navigation
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (item.getAttribute('aria-disabled') !== 'true') {
          item.click()
        }
      }
    })

    // Hover effect
    item.addEventListener('mouseenter', () => {
      if (item.getAttribute('aria-disabled') !== 'true') {
        item.classList.add('hover')
      }
    })
    
    item.addEventListener('mouseleave', () => {
      item.classList.remove('hover')
    })
    
    parent.submenu.appendChild(item)
    return item
  }
  
  addSeparator(parent) {
    const separator = document.createElement('div')
    separator.className = 'separator'
    parent.submenu.appendChild(separator)
  }
  
  // Öffentliche Methode: Aktiviert/deaktiviert einen Menüpunkt.
  // Wird von updateMenuState() in main.js aufgerufen, z.B.:
  //   menu.setItemEnabled('menu-save', hasModifiedTabs)
  // Deaktivierte Einträge sind ausgegraut und reagieren nicht auf Klicks.
  setItemEnabled(itemId, enabled) {
    const item = document.getElementById(itemId)
    if (item) {
      if (enabled) {
        item.removeAttribute('aria-disabled')
        item.classList.remove('disabled')
      } else {
        item.setAttribute('aria-disabled', 'true')
        item.classList.add('disabled')
      }
    }
  }
  
  setItemVisible(itemId, visible) {
    const item = document.getElementById(itemId)
    if (item) {
      item.style.display = visible ? '' : 'none'
    }
  }
  
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
  }
}