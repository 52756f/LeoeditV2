// clsProjectExplorer.js — Projekt-Explorer Panel.
// Zeigt den Inhalt eines Projektordners an (beschränkt auf Projektstamm).
// Projekt wird durch .leoedit.json Datei im Projektstamm definiert.
import {
    CreateProject,
    OpenProject,
    SelectProjectFolder,
    CheckProjectExists,
    ListProjectDirectory
} from '../wailsjs/go/main/App.js';

const ICON_FOLDER = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f6d32d" stroke="#f6d32d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
const ICON_FILE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
const ICON_UP = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
const ICON_PROJECT = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M3 5a2 2 0 0 0 2 2h3"/><path d="M3 3v13a2 2 0 0 0 2 2h3"/></svg>';

export class ProjectExplorer {
    /**
     * @param {HTMLElement} container - Das DOM-Element, in das der Explorer gerendert wird
     * @param {Object} options
     * @param {Function} options.onFileOpen - Callback wenn eine Datei geöffnet wird: (filepath) => void
     * @param {Function} options.onProjectChange - Callback wenn Projekt geöffnet/geschlossen wird: (project) => void
     */
    constructor(container, options = {}) {
        this.container = container;
        this.onFileOpen = options.onFileOpen || (() => {});
        this.onProjectChange = options.onProjectChange || (() => {});

        this.project = null;        // Aktuelles ProjectConfig
        this.currentPath = '';      // Aktuelles Verzeichnis im Projekt
        this.entries = [];

        this.buildDOM();
    }

    buildDOM() {
        this.container.innerHTML = '';

        this.panel = document.createElement('div');
        this.panel.className = 'project-explorer';

        // Header mit Pfadanzeige und "Hoch"-Button
        this.header = document.createElement('div');
        this.header.className = 'project-explorer-header';

        this.upBtn = document.createElement('button');
        this.upBtn.className = 'project-explorer-up-btn';
        this.upBtn.innerHTML = ICON_UP;
        this.upBtn.title = 'Übergeordneter Ordner';
        this.upBtn.addEventListener('click', () => this.navigateUp());

        this.pathLabel = document.createElement('div');
        this.pathLabel.className = 'project-explorer-path';

        this.header.appendChild(this.upBtn);
        this.header.appendChild(this.pathLabel);

        // Dateiliste
        this.listContainer = document.createElement('div');
        this.listContainer.className = 'project-explorer-list';

        // No-Project Ansicht
        this.noProjectView = document.createElement('div');
        this.noProjectView.className = 'project-explorer-no-project';

        this.panel.appendChild(this.header);
        this.panel.appendChild(this.listContainer);
        this.panel.appendChild(this.noProjectView);
        this.container.appendChild(this.panel);
        this.container.style.display = 'none';

        // Initial: Kein Projekt geladen
        this.renderNoProject();
    }

    renderNoProject() {
        this.header.style.display = 'none';
        this.listContainer.style.display = 'none';
        this.noProjectView.style.display = 'flex';

        this.noProjectView.innerHTML = `
            <div class="no-project-icon">${ICON_PROJECT}</div>
            <div class="no-project-text">Kein Projekt geöffnet</div>
            <div class="no-project-buttons">
                <button class="project-btn project-btn-open">Projekt öffnen</button>
                <button class="project-btn project-btn-new">Neues Projekt</button>
            </div>
        `;

        this.noProjectView.querySelector('.project-btn-open').addEventListener('click', () => this.openProjectDialog());
        this.noProjectView.querySelector('.project-btn-new').addEventListener('click', () => this.createProjectDialog());
    }

    async openProjectDialog() {
        try {
            const folder = await SelectProjectFolder();
            if (!folder) return; // Abgebrochen

            const exists = await CheckProjectExists(folder);
            if (exists) {
                await this.openProject(folder);
            } else {
                // Kein Projekt vorhanden → fragen ob erstellen
                const name = prompt('Kein Projekt gefunden. Neues Projekt erstellen?\n\nProjektname:',
                    folder.split('/').pop() || 'Mein Projekt');
                if (name) {
                    await this.createProject(folder, name);
                }
            }
        } catch (err) {
            console.error('Projekt öffnen fehlgeschlagen:', err);
            alert('Fehler: ' + err);
        }
    }

    async createProjectDialog() {
        try {
            const folder = await SelectProjectFolder();
            if (!folder) return; // Abgebrochen

            const exists = await CheckProjectExists(folder);
            if (exists) {
                const open = confirm('In diesem Ordner existiert bereits ein Projekt. Möchten Sie es öffnen?');
                if (open) {
                    await this.openProject(folder);
                }
                return;
            }

            const name = prompt('Projektname:', folder.split('/').pop() || 'Mein Projekt');
            if (name) {
                await this.createProject(folder, name);
            }
        } catch (err) {
            console.error('Projekt erstellen fehlgeschlagen:', err);
            alert('Fehler: ' + err);
        }
    }

    async openProject(folderPath) {
        try {
            const project = await OpenProject(folderPath);
            this.project = project;
            this.currentPath = project.rootPath;
            this.onProjectChange(project);
            await this.navigate(project.rootPath);
            this.showProjectView();
        } catch (err) {
            console.error('Projekt öffnen fehlgeschlagen:', err);
            throw err;
        }
    }

    async createProject(folderPath, name) {
        try {
            const project = await CreateProject(folderPath, name);
            this.project = project;
            this.currentPath = project.rootPath;
            this.onProjectChange(project);
            await this.navigate(project.rootPath);
            this.showProjectView();
        } catch (err) {
            console.error('Projekt erstellen fehlgeschlagen:', err);
            throw err;
        }
    }

    closeProject() {
        this.project = null;
        this.currentPath = '';
        this.entries = [];
        this.onProjectChange(null);
        this.renderNoProject();
    }

    showProjectView() {
        this.header.style.display = 'flex';
        this.listContainer.style.display = 'block';
        this.noProjectView.style.display = 'none';
    }

    async navigate(path) {
        if (!this.project) return;

        try {
            const result = await ListProjectDirectory(path, this.project.rootPath);
            if (result.error) {
                console.error('ListProjectDirectory error:', result.error);
                return;
            }

            this.currentPath = result.path;
            this.parentPath = result.parent;
            this.entries = result.entries || [];
            this.render();
        } catch (err) {
            console.error('Navigate failed:', err);
        }
    }

    navigateUp() {
        if (this.parentPath) {
            this.navigate(this.parentPath);
        }
    }

    render() {
        // Pfadanzeige: Projektname + relativer Pfad
        let displayPath = this.project?.name || 'Projekt';
        if (this.currentPath !== this.project?.rootPath) {
            const relativePath = this.currentPath.replace(this.project.rootPath, '');
            displayPath += relativePath;
        }
        this.pathLabel.textContent = this.truncatePath(displayPath, 25);
        this.pathLabel.title = this.currentPath;

        // "Hoch"-Button nur aktiv wenn nicht am Projektstamm
        const atRoot = this.currentPath === this.project?.rootPath;
        this.upBtn.disabled = atRoot || !this.parentPath;
        this.upBtn.style.opacity = (atRoot || !this.parentPath) ? '0.3' : '1';

        // Liste aufbauen
        this.listContainer.innerHTML = '';

        for (const entry of this.entries) {
            const item = document.createElement('div');
            item.className = entry.isDirectory ? 'file-item folder' : 'file-item file';

            const icon = document.createElement('span');
            icon.className = 'file-item-icon';
            icon.innerHTML = entry.isDirectory ? ICON_FOLDER : ICON_FILE;

            const name = document.createElement('span');
            name.className = 'file-item-name';
            name.textContent = entry.name;
            name.title = entry.name;

            item.appendChild(icon);
            item.appendChild(name);

            // Single-click: auswählen
            item.addEventListener('click', () => {
                this.listContainer.querySelectorAll('.file-item').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');
            });

            // Double-click: Ordner öffnen oder Datei laden
            item.addEventListener('dblclick', () => {
                if (entry.isDirectory) {
                    this.navigate(entry.path);
                } else {
                    this.onFileOpen(entry.path);
                }
            });

            this.listContainer.appendChild(item);
        }
    }

    truncatePath(path, maxLen) {
        if (!path || path.length <= maxLen) return path;
        return '...' + path.slice(-maxLen + 3);
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    toggle() {
        if (this.container.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }

    isVisible() {
        return this.container.style.display !== 'none';
    }

    isProjectOpen() {
        return this.project !== null;
    }

    getProjectName() {
        return this.project?.name || null;
    }

    getProject() {
        return this.project;
    }
}
