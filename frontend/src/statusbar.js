import { STATUS_MESSAGES } from './lib/constants.js';

const ICON_PROJECT = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/></svg>';

export class StatusBar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`StatusBar container "${containerId}" not found.`);
        }

        this.container.innerHTML = `
            <div class="statusbar-left">
                <span class="statusbar-item statusbar-project" style="display: none;">
                    <span class="statusbar-project-icon">${ICON_PROJECT}</span>
                    <span class="statusbar-project-name"></span>
                </span>
                <span class="statusbar-item statusbar-status">${STATUS_MESSAGES.READY}</span>
                <span class="statusbar-item statusbar-filepath"></span>
            </div>
            <div class="statusbar-right">
                <span class="statusbar-item statusbar-cursor">Ln 1, Col 1</span>
                <span class="statusbar-item statusbar-language">Text</span>
                <span class="statusbar-item statusbar-encoding">UTF-8</span>
            </div>
        `;

        this.elProject = this.container.querySelector('.statusbar-project');
        this.elProjectName = this.container.querySelector('.statusbar-project-name');
        this.elStatus = this.container.querySelector('.statusbar-status');
        this.elFilepath = this.container.querySelector('.statusbar-filepath');
        this.elCursor = this.container.querySelector('.statusbar-cursor');
        this.elLanguage = this.container.querySelector('.statusbar-language');
        this.elEncoding = this.container.querySelector('.statusbar-encoding');
    }

    update({ line, col, language, filepath, encoding, status } = {}) {
        if (line != null && col != null) {
            this.elCursor.textContent = `Ln ${line}, Col ${col}`;
        }
        if (language != null) {
            this.elLanguage.textContent = language;
        }
        if (filepath != null) {
            this.elFilepath.textContent = filepath;
        }
        if (encoding != null) {
            this.elEncoding.textContent = encoding;
        }
        if (status != null) {
            this.elStatus.textContent = status;
        }
    }

    updateCursor(line, col) {
        this.elCursor.textContent = `Ln ${line}, Col ${col}`;
    }

    setProject(projectName) {
        if (projectName) {
            this.elProjectName.textContent = projectName;
            this.elProject.style.display = 'inline-flex';
        } else {
            this.elProjectName.textContent = '';
            this.elProject.style.display = 'none';
        }
    }

    clear() {
        this.elStatus.textContent = STATUS_MESSAGES.READY;
        this.elFilepath.textContent = '';
        this.elCursor.textContent = 'Ln 1, Col 1';
        this.elLanguage.textContent = 'Text';
        this.elEncoding.textContent = 'UTF-8';
    }
}
