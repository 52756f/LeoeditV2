import { Logger } from './logger.js';
import { Decoration, EditorView } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

const OUTLINER_ICONS = {
    RefreshCw: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
    ChevronsUpDown: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>',
    ChevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    ChevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    SquareFunction: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/></svg>',
    FileText: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    Pyramid: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 16.88a1 1 0 0 1-.32-1.43l9-13.02a1 1 0 0 1 1.64 0l9 13.01a1 1 0 0 1-.32 1.44l-8.51 4.86a2 2 0 0 1-2 0Z"/></svg>',
};

function renderIcon(name) {
    const svg = OUTLINER_ICONS[name];
    if (!svg) return null;
    const template = document.createElement('template');
    template.innerHTML = svg.trim();
    return template.content.firstChild;
}

const highlightLineEffect = StateEffect.define();
const Log = new Logger("Outliner");

export const highlightLineField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (let effect of tr.effects) {
            if (effect.is(highlightLineEffect)) {
                decorations = effect.value;
            }
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});

export class CodeMirrorOutliner {
    constructor(containerId = 'outliner', editorContainerId) {
        this.container = document.getElementById(containerId);
        this.editor = null;
        this.outlineTree = [];
        this.view = null;
        this.highlightTimeout = null;

        this.init();
    }

    async init() {
        if (!this.container) {
            Log.error('Outliner Container nicht gefunden');
            return;
        }

        // Outliner-UI initialisieren
        this.setupUI();

        // Event-Listener für den Outliner-Buttons
        this.setupEventListeners();
    }

    setupUI() {
        // Outliner-Container-Struktur erstellen
        this.container.innerHTML = `
            <div class="outliner-header">
                <h3>Document Outline</h3>
                <div class="outliner-controls">
                    <button class="btn-refresh" title="Outline aktualisieren">
                        <i data-lucide="RefreshCw"></i>
                    </button>
                    <button class="btn-toggle-all" title="Alle einklappen/ausklappen">
                        <i data-lucide="ChevronsUpDown"></i>
                    </button>
                </div>
            </div>
            <div class="outliner-content">
                <div class="outliner-tree" id="outlinerTree"></div>
            </div>
        `;

        // Create icons for the header buttons
        this.createTreeIcons(this.container);
    }

    setupEventListeners() {
        // Event-Listener für den Outliner-Button in der Toolbar
        const outlinerBtn = document.querySelector('[title="Outliner"]');
        if (outlinerBtn) {
            outlinerBtn.addEventListener('click', () => this.toggleVisibility());
        }

        // Event-Listener für die Outliner-Buttons
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.btn-refresh')) {
                this.refreshOutline();
            } else if (e.target.closest('.btn-toggle-all')) {
                this.toggleAllNodes();
            } else if (e.target.closest('.outline-node')) {
                this.handleNodeClick(e.target.closest('.outline-node'));
            }
        });
    }

    setEditor(editorInstance) {
        this.editor = editorInstance;

        // Editor is set up - refresh will be called manually when needed
    }

    async refreshOutline() {
        if (!this.editor) {
            this.showEmptyState();
            return;
        }

        const content = this.getEditorContent();
        if (!content || content.trim() === '') {
            this.showEmptyState();
            return;
        }

        this.outlineTree = this.parseOutline(content);
        this.renderOutline();

        // Lucide Icons aktualisieren
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    getEditorContent() {
        // Holt den Inhalt aus dem Editor
        if (this.editor && typeof this.editor.getContent === 'function') {
            return this.editor.getContent();
        }
        return '';
    }

    parseOutline(content) {
        const outline = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            const commentMatch = trimmed.match(/^#|\/\//); // Kommentarlinien ausfiltern
            if (commentMatch) { return; }

            // // Überschriften erkennen (#, ##, ###, etc.)
            // const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            // if (headingMatch) {
            //     const level = headingMatch[1].length;
            //     const text = headingMatch[2];

            //     outline.push({
            //         level,
            //         text,
            //         line: index,
            //         children: [],
            //         collapsed: false
            //     });
            // }

            // // Listen-Elemente erkennen (-, *, 1.)
            // const listMatch = trimmed.match(/^(\s*)[-*+]\s+(.+)$/);
            // if (listMatch) {
            //     const indent = listMatch[1].length;
            //     const text = listMatch[2];

            //     outline.push({
            //         type: 'list',
            //         level: Math.floor(indent / 2) + 1,
            //         text,
            //         line: index,
            //         children: []
            //     });
            // }

            // 1. JavaScript/TypeScript Funktionen
            // function myFunction() { ... }
            // async function myAsyncFunc() { ... }
            // export function myFunc() { ... }
            // const myFunc = function() { ... }
            // const myFunc = () => { ... }
            const jsFunctionMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)/);
            if (jsFunctionMatch) {
                const isExport = jsFunctionMatch[1] ? true : false;
                const isAsync = jsFunctionMatch[2] ? true : false;
                const name = jsFunctionMatch[3];

                outline.push({
                    type: 'function',
                    name: name,
                    async: isAsync,
                    export: isExport,
                    line: index,
                    children: [],
                    level: 1
                });
            }

            // 2. Arrow Functions und Function Assignments
            // const myFunc = () => { ... }
            // const myFunc = function() { ... }
            // let myFunc = () => { ... }
            // var myFunc = () => { ... }
            const arrowFuncMatch = trimmed.match(/\b(const|let|var)\s+(\w+)\s*=\s*(async\s*)?(\([^)]*\)|[^=]+)\s*=>/);
            const funcAssignmentMatch = trimmed.match(/\b(const|let|var)\s+(\w+)\s*=\s*(async\s*)?function/);

            if (arrowFuncMatch) {
                const name = arrowFuncMatch[2];
                const isAsync = arrowFuncMatch[3] ? true : false;

                outline.push({
                    type: 'function',
                    name: name,
                    arrow: true,
                    async: isAsync,
                    line: index,
                    children: [],
                    level: 1
                });
            } else if (funcAssignmentMatch) {
                const name = funcAssignmentMatch[2];
                const isAsync = funcAssignmentMatch[3] ? true : false;

                outline.push({
                    type: 'function',
                    name: name,
                    assignment: true,
                    async: isAsync,
                    line: index,
                    children: [],
                    level: 1
                });
            }

            // 3. Methoden in Klassen (class methods)
            // myMethod() { ... }
            // async myAsyncMethod() { ... }
            const methodMatch = trimmed.match(/^(async\s+)?(\w+)\s*\([^)]*\)\s*\{/);
            if (methodMatch && !trimmed.startsWith('if') && !trimmed.startsWith('for') && !trimmed.startsWith('while') && !trimmed.startsWith('elsif') && !trimmed.startsWith('elif') && !trimmed.startsWith('else')) {
                const isAsync = methodMatch[1] ? true : false;
                const name = methodMatch[2];

                // Prüfen ob es sich um eine Methode in einer Klasse handelt
                const context = this.getContext(lines, index);

                outline.push({
                    type: 'method',
                    name: name,
                    async: isAsync,
                    line: index,
                    children: [],
                    level: context.inClass ? 2 : 1,
                    class: context.className
                });
            }

            // 4. Getter/Setter Methoden
            // get myProperty() { ... }
            // set myProperty(value) { ... }
            const getterSetterMatch = trimmed.match(/^(get|set)\s+(\w+)\s*\([^)]*\)?\s*\{/);
            if (getterSetterMatch) {
                const type = getterSetterMatch[1]; // 'get' oder 'set'
                const name = getterSetterMatch[2];

                outline.push({
                    type: type === 'get' ? 'getter' : 'setter',
                    name: name,
                    line: index,
                    children: [],
                    level: 2
                });
            }

            // 5. Klassendeklarationen
            // class MyClass { ... }
            // export class MyClass { ... }
            const classMatch = trimmed.match(/^(export\s+)?class\s+(\w+)/);
            if (classMatch) {
                const isExport = classMatch[1] ? true : false;
                const name = classMatch[2];

                outline.push({
                    type: 'class',
                    name: name,
                    export: isExport,
                    line: index,
                    children: [],
                    level: 0
                });
            }

            // 6. Sub/Prozeduren (für verschiedene Sprachen)
            // sub mySub { ... } (Perl)
            // sub mySub { ... } (VBA)
            // procedure MyProcedure; (Pascal/Delphi)
            const subMatch = trimmed.match(/^(sub|procedure|proc)\s+(\w+)/i);
            if (subMatch) {
                const keyword = subMatch[1].toLowerCase();
                const name = subMatch[2];

                outline.push({
                    type: keyword === 'sub' ? 'sub' : 'procedure',
                    name: name,
                    line: index,
                    children: [],
                    level: 1
                });
            }

            // 7. Python Funktionen/Defs
            // def my_function(): 
            const pythonMatch = trimmed.match(/^def\s+(\w+)/);
            if (pythonMatch) {
                const name = pythonMatch[1];

                outline.push({
                    type: 'function',
                    language: 'python',
                    name: name,
                    line: index,
                    children: [],
                    level: 1
                });
            }

            // 9. Go Funktionen
            // func myFunction() { ... }
            // func (a *App) startup(ctx context.Context) { ... }
            const goFunctionMatch = trimmed.match(/^func\s+(\([^)]*\)\s+)?(\w+)\s*\([^)]*\)/);
            if (goFunctionMatch) {
                const name = goFunctionMatch[2] || goFunctionMatch[1];

                outline.push({
                    type: 'function',
                    language: 'go',
                    name: name,
                    line: index,
                    children: [],
                    level: 1
                });
            }

            // 10. PHP Funktionen
            // function myFunction() { ... }
            const phpFunctionMatch = trimmed.match(/^\s*(public|private|protected)?\s*(static)?\s*function\s+(\w+)/);
            if (phpFunctionMatch && !trimmed.includes('=')) {
                const visibility = phpFunctionMatch[1] || 'public';
                const isStatic = phpFunctionMatch[2] ? true : false;
                const name = phpFunctionMatch[3];

                outline.push({
                    type: 'function',
                    language: 'php',
                    name: name,
                    visibility: visibility,
                    static: isStatic,
                    line: index,
                    children: [],
                    level: 1
                });
            }

            // 9. C#/Java Methoden
            // public void MyMethod() { ... }
            // private static int MyMethod() { ... }
            const csharpMethodMatch = trimmed.match(/^\s*(public|private|protected|internal)\s+(static\s+)?(\w+\s+)?(\w+)\s*\([^)]*\)/);
            if (csharpMethodMatch && trimmed.includes('{')) {
                const visibility = csharpMethodMatch[1];
                const isStatic = csharpMethodMatch[2] ? true : false;
                const name = csharpMethodMatch[4];

                // Prüfen ob es kein Konstruktor ist
                if (name && !name.includes('class') && !name.includes('interface')) {
                    outline.push({
                        type: 'method',
                        language: 'csharp',
                        name: name,
                        visibility: visibility,
                        static: isStatic,
                        line: index,
                        children: [],
                        level: 1
                    });
                }
            }

            // 10. Konstruktoren
            // constructor() { ... }
            // __construct() {PHP}
            const constructorMatch = trimmed.match(/^\s*(constructor|__construct)\s*\([^)]*\)/);
            if (constructorMatch) {
                const name = constructorMatch[1];

                outline.push({
                    type: 'constructor',
                    name: name,
                    line: index,
                    children: [],
                    level: 1
                });
            }

            // 11. Destruktoren
            // destructor() { ... }
            // __destruct() {PHP}
            const destructorMatch = trimmed.match(/^\s*(destructor|__destruct)\s*\([^)]*\)/);
            if (destructorMatch) {
                const name = destructorMatch[1];

                outline.push({
                    type: 'destructor',
                    name: name,
                    line: index,
                    children: [],
                    level: 1
                });
            }


        });

        // Remove duplicates based on line number and text/name
        const uniqueOutline = this.removeDuplicates(outline);

        // Sort alphabetically by name before building tree
        uniqueOutline.sort((a, b) => {
            const nameA = (a.name || a.text || '').toLowerCase();
            const nameB = (b.name || b.text || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        return this.buildTree(uniqueOutline);
    }

    removeDuplicates(outline) {
        const seen = new Set();
        return outline.filter(item => {
            const key = `${item.line}-${item.name || item.text}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Hilfsmethode um Kontext zu ermitteln (z.B. ob in einer Klasse)
    getContext(lines, currentLine) {
        const context = {
            inClass: false,
            className: null,
            indentLevel: 0
        };

        // Prüfe rückwärts nach Klassendeklaration
        for (let i = currentLine; i >= 0; i--) {
            const line = lines[i].trim();

            // Klassendeklaration gefunden
            const classMatch = line.match(/^class\s+(\w+)/);
            if (classMatch) {
                context.inClass = true;
                context.className = classMatch[1];
                break;
            }

            // Wenn wir zu viel zurückgegangen sind (außerhalb des Blocks)
            if (i < currentLine - 50) { // Max 50 Zeilen zurück schauen
                break;
            }
        }

        // Ermittle Einrückungsebene
        const currentIndent = lines[currentLine].match(/^(\s*)/)[1].length;
        context.indentLevel = Math.floor(currentIndent / 4); // 4 Spaces pro Ebene

        return context;
    }

    buildTree(items) {
        const tree = [];
        const stack = [];

        items.forEach(item => {
            item.children = [];

            while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
                stack.pop();
            }

            if (stack.length === 0) {
                tree.push(item);
            } else {
                stack[stack.length - 1].children.push(item);
            }

            stack.push(item);
        });

        return tree;
    }

    renderOutline() {
        const treeContainer = this.container.querySelector('#outlinerTree');

        if (this.outlineTree.length === 0) {
            const icon = renderIcon("FileText");
            treeContainer.innerHTML = `
                <div class="outliner-empty">
                </div>
            `;
            treeContainer.querySelector('.outliner-empty').appendChild(icon);
            const text = document.createElement('p');
            text.textContent = 'Keine Elemente gefunden';
            treeContainer.querySelector('.outliner-empty').appendChild(text);
            return;
        }

        treeContainer.innerHTML = this.renderTree(this.outlineTree);
        this.createTreeIcons(treeContainer);
    }

    createTreeIcons(container) {
        // Create icons for all nodes with data-lucide attributes
        container.querySelectorAll('[data-lucide]').forEach(element => {
            const iconName = element.getAttribute('data-lucide');
            const icon = renderIcon(iconName);
            if (icon) {
                element.replaceWith(icon);
            }
        });
    }

    renderTree(items, depth = 0) {
        let html = '<ul class="outline-list">';

        items.forEach(item => {
            const hasChildren = item.children && item.children.length > 0;
            const icon = hasChildren ?
                (item.collapsed ? 'ChevronRight' : 'ChevronDown') :
                (item.type === 'list' ? 'Pyramid' : 'SquareFunction');

            // Use name for code items, text for markdown items
            const displayText = item.name || item.text || '';
            const titleText = item.name || item.text || '';

            html += `
                <li class="outline-item" data-level="${item.level}" data-line="${item.line}">
                    <div class="outline-node ${hasChildren ? 'has-children' : ''} ${item.collapsed ? 'collapsed' : ''}">
                        ${hasChildren ? `
                            <button class="toggle-btn">
                                <i data-lucide="${icon}"></i>
                            </button>
                        ` : `
                            <span class="node-icon">
                                <i data-lucide="${icon}"></i>
                            </span>
                        `}
                        <span class="node-text" title="${titleText}">${this.truncateText(displayText, 50)}</span>
                    </div>
                    ${hasChildren && !item.collapsed ? this.renderTree(item.children, depth + 1) : ''}
                </li>
            `;
        });

        html += '</ul>';
        return html;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    handleNodeClick(nodeElement) {
        const line = nodeElement.closest('.outline-item').dataset.line;

        // Zum entsprechenden Editor-Bereich springen
        this.navigateToLine(parseInt(line));

        // Bei Eltern-Elementen: Ein-/Ausklappen
        if (nodeElement.classList.contains('has-children')) {
            this.toggleNode(nodeElement);
        }
    }

    toggleNode(nodeElement) {
        const itemElement = nodeElement.closest('.outline-item');
        const children = itemElement.querySelector('ul');

        if (children) {
            const isCollapsed = nodeElement.classList.contains('collapsed');

            if (isCollapsed) {
                nodeElement.classList.remove('collapsed');
                children.style.display = 'block';
                // Update the icon to ChevronDown
                const iconContainer = nodeElement.querySelector('.node-icon, .toggle-btn');
                if (iconContainer) {
                    const existingIcon = iconContainer.querySelector('svg, i');
                    const newIcon = renderIcon('ChevronDown');
                    if (newIcon && existingIcon) {
                        existingIcon.replaceWith(newIcon);
                    }
                }
            } else {
                nodeElement.classList.add('collapsed');
                children.style.display = 'none';
                // Update the icon to ChevronRight
                const iconContainer = nodeElement.querySelector('.node-icon, .toggle-btn');
                if (iconContainer) {
                    const existingIcon = iconContainer.querySelector('svg, i');
                    const newIcon = renderIcon('ChevronRight');
                    if (newIcon && existingIcon) {
                        existingIcon.replaceWith(newIcon);
                    }
                }
            }
        }
    }

    toggleAllNodes() {
        const allNodes = this.container.querySelectorAll('.outline-node.has-children');
        const firstNode = allNodes[0];
        const shouldCollapse = firstNode ? !firstNode.classList.contains('collapsed') : false;

        allNodes.forEach(node => {
            if (shouldCollapse && !node.classList.contains('collapsed')) {
                this.toggleNode(node);
            } else if (!shouldCollapse && node.classList.contains('collapsed')) {
                this.toggleNode(node);
            }
        });
    }

    navigateToLine(lineNumber) {
        if (!this.editor?.view) return;

        if (this.highlightTimeout) clearTimeout(this.highlightTimeout);

        try {
            // Convert 0-based lineNumber (from outliner) → 1-based for CM6
            const cm6LineNum = lineNumber + 1;
            const line = this.editor.view.state.doc.line(cm6LineNum);
            const pos = line.from;

            // Apply selection first
            this.editor.view.dispatch({
                selection: { anchor: pos, head: pos },
                effects: EditorView.scrollIntoView(pos, {
                    y: 'center',
                    x: 'nearest' // Behält die horizontale Position bei, sofern das Zeichen sichtbar ist
                })
            });
            scrollToSelectedLine(this.editor.view);
            // Apply highlight
            const mark = Decoration.line({ attributes: { class: 'cm-line-highlight' } });
            const decorations = Decoration.set([mark.range(pos)]);
            this.editor.view.dispatch({
                effects: highlightLineEffect.of(decorations)
            });

            this.highlightTimeout = setTimeout(() => {
                if (this.editor?.view) {
                    this.editor.view.dispatch({
                        effects: highlightLineEffect.of(Decoration.none)
                    });
                }
                this.highlightTimeout = null;
            }, 3000);

        } catch (e) {
            Log.warn('Line out of range:', lineNumber, e);
        }
    }

    highlightCurrentSection() {
        if (!this.editor) return;

        // Aktuelle Cursor-Position finden
        // und entsprechenden Outline-Node hervorheben
        const currentLine = this.getCurrentLine();

        // Alle Highlights entfernen
        this.container.querySelectorAll('.outline-node').forEach(node => {
            node.classList.remove('active');
        });

        // Aktiven Node finden und hervorheben
        const activeNode = this.container.querySelector(`[data-line="${currentLine}"]`);
        if (activeNode) {
            activeNode.querySelector('.outline-node').classList.add('active');
        }
    }

    getCurrentLine() {
        // Holt die aktuelle Cursor-Zeile aus dem Editor
        if (this.editor && this.editor.view) {
            const state = this.editor.view.state;
            const selection = state.selection.main;
            return state.doc.lineAt(selection.head).number;
        }
        return 0;
    }

    toggleVisibility() {
        this.container.classList.toggle('hidden');

        // Wenn der Outliner sichtbar wird, aktualisieren
        if (!this.container.classList.contains('hidden')) {
            this.refreshOutline();
        }
    }

    showEmptyState() {
        const treeContainer = this.container.querySelector('#outlinerTree');
        const icon = renderIcon("FileText");
        treeContainer.innerHTML = `
            <div class="outliner-empty">
            </div>
        `;
        const emptyDiv = treeContainer.querySelector('.outliner-empty');
        emptyDiv.appendChild(icon);
        const text = document.createElement('small');
        text.innerHTML = '<br />Kein Inhalt gefunden. Öffnen Sie eine Datei mit Code';
        emptyDiv.appendChild(text);
    }

    debouncedRefresh = this.debounce(() => {
        this.refreshOutline();
    }, 500);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// CSS-Styles für den Outliner
const outlinerStyles = `

#outliner{
    background: #1e1e1e;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.outliner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #3c3c3c;
    background: #252526;
    flex-shrink: 0;
}

.outliner-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #cccccc;
}

.outliner-controls {
    display: flex;
    gap: 8px;
}

.outliner-controls button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
    color: #858585;
}

.outliner-controls button:hover {
    background: #3c3c3c;
    color: #cccccc;
}

.outliner-content {
    padding-left: 8px;
    overflow-y: auto;
    flex: 1;
}

.outline-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.outline-item {
    margin: 2px 0;
}

.outline-node {
    display: flex;
    align-items: center;
    padding-left: 6px;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    font-size: 13px;
    color: #cccccc;
}

.outline-node:hover {
    background: #2a2d2e;
}

.outline-node.active {
    background: #094771;
    color: #ffffff;
}

.toggle-btn, .node-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-right: 6px;
    flex-shrink: 0;
}

.toggle-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: #858585;
}

.node-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.outliner-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #858585;
    text-align: center;
}

.outliner-empty i {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    color: #555555;
}

.outliner-empty p {
    margin: 0 0 4px 0;
    font-weight: 500;
}

.outliner-empty small {
    font-size: 12px;
    color: #858585;
}

.outliner-resizer {
    height: 4px;
    background: #252526;
    cursor: ns-resize;
    flex-shrink: 0;
    border-top: 1px solid #3c3c3c;
    border-bottom: 1px solid #3c3c3c;
}

.outliner-resizer:hover {
    background: #007acc;
}

.cm-line-highlight {
    background-color: rgba(0, 122, 204, 0.15) !important;
}
`;

// Styles dem Dokument hinzufügen
const styleSheet = document.createElement('style');
styleSheet.textContent = outlinerStyles;
document.head.appendChild(styleSheet);


/**
 * Centered scrolling to the current selection
 * @param {EditorView} view 
 */
function scrollToSelectedLine(view) {
    // 1. Get the current main selection position
    const pos = view.state.selection.main.head;

    // 2. Dispatch a transaction to scroll that position to the center
    view.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: 'center' })
    });
}