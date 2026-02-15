import { Logger } from './logger.js';

// SVG-Icons als Inline-Strings für die Menüeinträge
const iconData = {
  'FolderTree': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-tree-icon lucide-folder-tree"><path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M3 5a2 2 0 0 0 2 2h3"/><path d="M3 3v13a2 2 0 0 0 2 2h3"/></svg>',
  'Project': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/><circle cx="12" cy="13" r="2"/><path d="M12 15v2"/></svg>',
  'Search': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  'Sparkles': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-sparkles-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M13 7a9.3 9.3 0 0 0 1.516 -.546c.911 -.438 1.494 -1.015 1.937 -1.932c.207 -.428 .382 -.928 .547 -1.522c.165 .595 .34 1.095 .547 1.521c.443 .918 1.026 1.495 1.937 1.933c.426 .205 .925 .38 1.516 .546a9.3 9.3 0 0 0 -1.516 .547c-.911 .438 -1.494 1.015 -1.937 1.932a9 9 0 0 0 -.547 1.521c-.165 -.594 -.34 -1.095 -.547 -1.521c-.443 -.918 -1.026 -1.494 -1.937 -1.932a9 9 0 0 0 -1.516 -.547" /><path d="M3 14a21 21 0 0 0 1.652 -.532c2.542 -.953 3.853 -2.238 4.816 -4.806a20 20 0 0 0 .532 -1.662a20 20 0 0 0 .532 1.662c.963 2.567 2.275 3.853 4.816 4.806q .75 .28 1.652 .532a21 21 0 0 0 -1.652 .532c-2.542 .953 -3.854 2.238 -4.816 4.806a20 20 0 0 0 -.532 1.662a20 20 0 0 0 -.532 -1.662c-.963 -2.568 -2.275 -3.853 -4.816 -4.806a21 21 0 0 0 -1.652 -.532" /></svg>',
  'Terminal': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9l3 3l-3 3"/><path d="M13 15l3 0"/><path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/></svg>',
};

const toolbarHTML = `
           <aside id="asideToolbar">
                <div class="tool-btn" title="Explorer">${iconData.FolderTree}</div>
                <div class="tool-btn" title="Projekt">${iconData.Project}</div>
                <div class="tool-btn" title="Suchen">${iconData.Search}</div>
                <div class="tool-btn" title="AI Fenster">${iconData.Sparkles}</div>
                <div class="tool-btn" title="Terminal">${iconData.Terminal}</div>
           </aside>`;

export class LeftToolbar {
    constructor(toolbarId = 'asideToolbar') {
        this.toolbar = document.getElementById(toolbarId);
        if (!this.toolbar) {
            throw new Error(`Toolbar element with id "${toolbarId}" not found.`);
        }

        // Füge toolbarHTML ins DOM ein
        this.toolbar.innerHTML = toolbarHTML;

        this.actions = new Map(); // Maps title attribute → handler function
        this.logger = new Logger("LeftToolbar");

        this.bindEvents();
    }

    /**
     * Sets up event delegation on the toolbar
     */
    bindEvents() {
        this.toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.tool-btn');
            if (!btn) return;

            const title = btn.getAttribute('title');
            if (title && this.actions.has(title)) {
                const eleFileItems = document.querySelectorAll(".file-item.file");
                eleFileItems.forEach(element => {
                    element.classList.remove("selected");
                });


                const handler = this.actions.get(title);
                handler.call(this, e);
            }
        });

    }

    /**
     * Register a click handler for a toolbar button by its title
     * @param {string} title - The `title` attribute of the .tool-btn (e.g., "Neu")
     * @param {Function} handler - Callback function to execute
     */
    registerAction(title, handler) {
        this.actions.set(title, handler);
    }

    /**
     * Enable or disable a toolbar button by title
     * @param {string} title
     * @param {boolean} enabled
     */
    setButtonEnabled(title, enabled) {
        const btn = Array.from(this.toolbar.querySelectorAll('.tool-btn'))
            .find(b => b.getAttribute('title') === title);
        if (btn) {
            btn.style.opacity = enabled ? '1' : '0.4';
            btn.style.pointerEvents = enabled ? 'auto' : 'none';
        }
    }

    /**
     * Optional: Add tooltip (if you later use a tooltip lib or title fallback)
     */
    updateTooltip(title, newTooltip) {
        const btn = Array.from(this.toolbar.querySelectorAll('.tool-btn'))
            .find(b => b.getAttribute('title') === title);
        if (btn) {
            btn.setAttribute('title', newTooltip);
        }
    }
}