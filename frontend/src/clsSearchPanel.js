// clsSearchPanel.js — Such-Panel für Projektdateien.
// Durchsucht Dateien im Projekt und zeigt Treffer mit Schnellsprung-Links.
import { SearchInDirectory } from '../wailsjs/go/main/App.js';

const ICON_SEARCH = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
const ICON_FILE = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
const ICON_CLEAR = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

export class SearchPanel {
    /**
     * @param {HTMLElement} container - Das DOM-Element für das Panel
     * @param {Object} options
     * @param {Function} options.onFileOpen - Callback: (filepath, lineNumber) => void
     * @param {Function} options.getSearchRoot - Callback: () => string (Projektpfad oder null)
     */
    constructor(container, options = {}) {
        this.container = container;
        this.onFileOpen = options.onFileOpen || (() => {});
        this.getSearchRoot = options.getSearchRoot || (() => null);

        this.currentResults = null;
        this.isSearching = false;

        this.buildDOM();
    }

    buildDOM() {
        this.container.innerHTML = '';

        this.panel = document.createElement('div');
        this.panel.className = 'search-panel';

        // Suchleiste
        this.searchBar = document.createElement('div');
        this.searchBar.className = 'search-bar';

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'search-input';
        this.searchInput.placeholder = 'Suchen...';

        this.clearBtn = document.createElement('button');
        this.clearBtn.className = 'search-clear-btn';
        this.clearBtn.innerHTML = ICON_CLEAR;
        this.clearBtn.title = 'Löschen';
        this.clearBtn.style.display = 'none';

        this.searchBtn = document.createElement('button');
        this.searchBtn.className = 'search-btn';
        this.searchBtn.innerHTML = ICON_SEARCH;
        this.searchBtn.title = 'Suchen';

        this.searchBar.appendChild(this.searchInput);
        this.searchBar.appendChild(this.clearBtn);
        this.searchBar.appendChild(this.searchBtn);

        // Optionen
        this.optionsBar = document.createElement('div');
        this.optionsBar.className = 'search-options';

        this.caseSensitiveCheckbox = document.createElement('input');
        this.caseSensitiveCheckbox.type = 'checkbox';
        this.caseSensitiveCheckbox.id = 'search-case-sensitive';

        const caseSensitiveLabel = document.createElement('label');
        caseSensitiveLabel.htmlFor = 'search-case-sensitive';
        caseSensitiveLabel.textContent = 'Groß/Klein';

        this.optionsBar.appendChild(this.caseSensitiveCheckbox);
        this.optionsBar.appendChild(caseSensitiveLabel);

        // Status
        this.statusBar = document.createElement('div');
        this.statusBar.className = 'search-status';

        // Ergebnisliste
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.className = 'search-results';

        this.panel.appendChild(this.searchBar);
        this.panel.appendChild(this.optionsBar);
        this.panel.appendChild(this.statusBar);
        this.panel.appendChild(this.resultsContainer);
        this.container.appendChild(this.panel);
        this.container.style.display = 'none';

        this.bindEvents();
        this.renderNoProject();
    }

    bindEvents() {
        // Enter-Taste startet Suche
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Eingabe-Änderung
        this.searchInput.addEventListener('input', () => {
            this.clearBtn.style.display = this.searchInput.value ? 'flex' : 'none';
        });

        // Such-Button
        this.searchBtn.addEventListener('click', () => this.performSearch());

        // Löschen-Button
        this.clearBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.clearBtn.style.display = 'none';
            this.clearResults();
            this.searchInput.focus();
        });
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        const rootPath = this.getSearchRoot();
        if (!rootPath) {
            this.statusBar.textContent = 'Kein Projekt geöffnet';
            this.statusBar.className = 'search-status search-status-error';
            return;
        }

        if (this.isSearching) return;
        this.isSearching = true;

        this.statusBar.textContent = 'Suche...';
        this.statusBar.className = 'search-status search-status-searching';
        this.resultsContainer.innerHTML = '';

        try {
            const caseSensitive = this.caseSensitiveCheckbox.checked;
            const result = await SearchInDirectory(rootPath, query, caseSensitive);

            if (result.error) {
                this.statusBar.textContent = result.error;
                this.statusBar.className = 'search-status search-status-error';
            } else {
                this.currentResults = result;
                this.renderResults(result);
            }
        } catch (err) {
            this.statusBar.textContent = 'Fehler: ' + err;
            this.statusBar.className = 'search-status search-status-error';
        } finally {
            this.isSearching = false;
        }
    }

    renderResults(result) {
        const matchCount = result.matches.length;
        const suffix = matchCount >= 500 ? '+' : '';
        this.statusBar.textContent = `${matchCount}${suffix} Treffer in ${result.totalFiles} Dateien`;
        this.statusBar.className = 'search-status';

        this.resultsContainer.innerHTML = '';

        if (matchCount === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'search-no-results';
            noResults.textContent = 'Keine Treffer gefunden';
            this.resultsContainer.appendChild(noResults);
            return;
        }

        // Gruppiere nach Datei
        const byFile = new Map();
        for (const match of result.matches) {
            if (!byFile.has(match.filePath)) {
                byFile.set(match.filePath, []);
            }
            byFile.get(match.filePath).push(match);
        }

        // Render jede Dateigruppe
        for (const [filePath, matches] of byFile) {
            const fileGroup = document.createElement('div');
            fileGroup.className = 'search-file-group';

            // Datei-Header
            const fileHeader = document.createElement('div');
            fileHeader.className = 'search-file-header';

            const relativePath = filePath.replace(result.rootPath + '/', '');
            fileHeader.innerHTML = `
                <span class="search-file-icon">${ICON_FILE}</span>
                <span class="search-file-name" title="${filePath}">${relativePath}</span>
                <span class="search-file-count">${matches.length}</span>
            `;

            fileHeader.addEventListener('click', () => {
                fileGroup.classList.toggle('collapsed');
            });

            fileGroup.appendChild(fileHeader);

            // Treffer-Liste
            const matchList = document.createElement('div');
            matchList.className = 'search-match-list';

            for (const match of matches) {
                const matchItem = document.createElement('div');
                matchItem.className = 'search-match-item';
                matchItem.title = `Zeile ${match.lineNumber}: ${match.lineText}`;

                // Zeilennummer
                const lineNum = document.createElement('span');
                lineNum.className = 'search-line-number';
                lineNum.textContent = match.lineNumber;

                // Zeilen-Text mit Highlight
                const lineText = document.createElement('span');
                lineText.className = 'search-line-text';
                lineText.innerHTML = this.highlightMatch(match.lineText, result.query, this.caseSensitiveCheckbox.checked);

                matchItem.appendChild(lineNum);
                matchItem.appendChild(lineText);

                // Klick → Datei öffnen und zur Zeile springen
                matchItem.addEventListener('click', () => {
                    this.onFileOpen(match.filePath, match.lineNumber);
                });

                matchList.appendChild(matchItem);
            }

            fileGroup.appendChild(matchList);
            this.resultsContainer.appendChild(fileGroup);
        }
    }

    highlightMatch(text, query, caseSensitive) {
        const escaped = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);

        if (caseSensitive) {
            return escaped.replace(new RegExp(`(${this.escapeRegex(escapedQuery)})`, 'g'), '<mark>$1</mark>');
        } else {
            return escaped.replace(new RegExp(`(${this.escapeRegex(escapedQuery)})`, 'gi'), '<mark>$1</mark>');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    clearResults() {
        this.currentResults = null;
        this.statusBar.textContent = '';
        this.statusBar.className = 'search-status';
        this.resultsContainer.innerHTML = '';
    }

    renderNoProject() {
        this.statusBar.textContent = '';
        this.resultsContainer.innerHTML = `
            <div class="search-no-project">
                <div class="search-no-project-text">Öffne ein Projekt um zu suchen</div>
            </div>
        `;
    }

    show() {
        this.container.style.display = 'block';
        this.searchInput.focus();
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
}
