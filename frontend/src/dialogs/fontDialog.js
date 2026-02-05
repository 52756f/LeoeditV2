import { GetEditorSettings, SetEditorSettings } from '../../wailsjs/go/main/App.js';

// Fonts mit Google Fonts URL
const AVAILABLE_FONTS = [
    { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace', googleFont: 'JetBrains+Mono:wght@400;500;700' },
    { name: 'Fira Code', value: 'Fira Code, monospace', googleFont: 'Fira+Code:wght@400;500;700' },
    { name: 'Source Code Pro', value: 'Source Code Pro, monospace', googleFont: 'Source+Code+Pro:wght@400;500;700' },
    { name: 'Ubuntu Mono', value: 'Ubuntu Mono, monospace', googleFont: 'Ubuntu+Mono:wght@400;700' },
    { name: 'Roboto Mono', value: 'Roboto Mono, monospace', googleFont: 'Roboto+Mono:wght@400;500;700' },
    { name: 'IBM Plex Mono', value: 'IBM Plex Mono, monospace', googleFont: 'IBM+Plex+Mono:wght@400;500;700' },
    { name: 'Inconsolata', value: 'Inconsolata, monospace', googleFont: 'Inconsolata:wght@400;500;700' },
    { name: 'Space Mono', value: 'Space Mono, monospace', googleFont: 'Space+Mono:wght@400;700' },
    // System Fonts
    { name: 'Consolas', value: 'Consolas, monospace', googleFont: null },
    { name: 'Monaco', value: 'Monaco, monospace', googleFont: null },
    { name: 'Cascadia Code', value: 'Cascadia Code, monospace', googleFont: null },
    { name: 'Courier New', value: 'Courier New, monospace', googleFont: null },
    { name: 'System Monospace', value: 'monospace', googleFont: null },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

let currentSettings = null;
let onChangeCallback = null;
let fontsLoaded = false;
let selectedFont = null;
let selectedSize = 14;

export function setFontChangeCallback(callback) {
    onChangeCallback = callback;
}

function loadGoogleFonts() {
    if (fontsLoaded) return;

    const googleFonts = AVAILABLE_FONTS
        .filter(f => f.googleFont)
        .map(f => f.googleFont)
        .join('&family=');

    if (googleFonts) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${googleFonts}&display=swap`;
        document.head.appendChild(link);
        fontsLoaded = true;
    }
}

export async function showFontDialog() {
    loadGoogleFonts();

    const existing = document.getElementById('font-dialog-overlay');
    if (existing) existing.remove();

    currentSettings = await GetEditorSettings();
    selectedFont = currentSettings.font || 'JetBrains Mono, monospace';
    selectedSize = currentSettings.fontSize || 14;

    const overlay = document.createElement('div');
    overlay.id = 'font-dialog-overlay';
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
        <div class="dialog font-dialog-new">
            <div class="dialog-header">
                <h3>Schriftart wählen</h3>
                <button class="dialog-close" id="font-dialog-close">&times;</button>
            </div>
            <div class="font-dialog-body">
                <div class="font-list">
                    ${AVAILABLE_FONTS.map(f => `
                        <div class="font-item ${selectedFont.includes(f.name) ? 'selected' : ''}"
                             data-font="${f.value}"
                             style="font-family: ${f.value}">
                            ${f.name}
                        </div>
                    `).join('')}
                </div>
                <div class="font-preview-panel">
                    <div class="font-size-bar">
                        <label>Größe:</label>
                        ${FONT_SIZES.map(s => `
                            <button class="size-btn ${selectedSize === s ? 'active' : ''}" data-size="${s}">${s}</button>
                        `).join('')}
                    </div>
                    <div id="font-preview" class="font-preview-large">
                        <div class="preview-line">Der schnelle braune Fuchs springt über den faulen Hund.</div>
                        <div class="preview-line">The quick brown fox jumps over the lazy dog.</div>
                        <div class="preview-line">ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
                        <div class="preview-line">abcdefghijklmnopqrstuvwxyz</div>
                        <div class="preview-line">0123456789</div>
                        <div class="preview-code">function example(x) {
    if (x > 0) {
        return x * 2;
    }
    return null;
}</div>
                    </div>
                </div>
            </div>
            <div class="dialog-footer">
                <button id="font-dialog-cancel" class="btn btn-secondary">Abbrechen</button>
                <button id="font-dialog-save" class="btn btn-primary">Übernehmen</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const preview = document.getElementById('font-preview');
    const fontItems = overlay.querySelectorAll('.font-item');
    const sizeButtons = overlay.querySelectorAll('.size-btn');

    function updatePreview() {
        preview.style.fontFamily = selectedFont;
        preview.style.fontSize = selectedSize + 'px';
    }

    // Font selection
    fontItems.forEach(item => {
        item.addEventListener('click', () => {
            fontItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedFont = item.dataset.font;
            updatePreview();
        });
    });

    // Size selection
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSize = parseInt(btn.dataset.size);
            updatePreview();
        });
    });

    updatePreview();

    // Close handlers
    document.getElementById('font-dialog-close').addEventListener('click', () => overlay.remove());
    document.getElementById('font-dialog-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Save handler
    document.getElementById('font-dialog-save').addEventListener('click', async () => {
        await SetEditorSettings(selectedFont, selectedSize);
        if (onChangeCallback) {
            onChangeCallback(selectedFont, selectedSize);
        }
        overlay.remove();
    });
}

export function loadEditorFonts() {
    loadGoogleFonts();
}
