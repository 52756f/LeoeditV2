import { SetOpenRouterApiKey, GetOpenRouterApiKey, HasOpenRouterApiKey, SetGeminiApiKey, GetGeminiApiKey, HasGeminiApiKey } from '../../wailsjs/go/main/App.js';

export async function showApiKeyDialog() {
    const existing = document.getElementById('apikey-dialog-overlay');
    if (existing) existing.remove();

    // Get current key status for OpenRouter
    const hasOpenRouterKey = await HasOpenRouterApiKey();
    const currentOpenRouterKey = hasOpenRouterKey ? await GetOpenRouterApiKey() : '';
    const maskedOpenRouterKey = currentOpenRouterKey ? '••••••••••••' + currentOpenRouterKey.slice(-4) : '';

    // Get current key status for Gemini
    const hasGeminiKey = await HasGeminiApiKey();
    const currentGeminiKey = hasGeminiKey ? await GetGeminiApiKey() : '';
    const maskedGeminiKey = currentGeminiKey ? '••••••••••••' + currentGeminiKey.slice(-4) : '';
 
    const overlay = document.createElement('div');
    overlay.id = 'apikey-dialog-overlay';
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
        <div class="dialog apikey-dialog">
            <div class="dialog-header">
                <h3>API Key Einstellungen</h3>
                <button class="dialog-close" id="apikey-dialog-close">&times;</button>
            </div>
            <div class="dialog-body">
                <h4>OpenRouter API Key</h4>
                <p class="apikey-info">
                    Der API Key wird verschlüsselt gespeichert.<br>
                    <a href="https://openrouter.ai/keys" target="_blank" class="apikey-link">API Key bei OpenRouter erstellen</a>
                </p>
                <div class="apikey-status ${hasOpenRouterKey ? 'has-key' : 'no-key'}">
                    ${hasOpenRouterKey ? '✓ OpenRouter API Key ist gesetzt' : '✗ OpenRouter API Key nicht konfiguriert'}
                </div>
                ${hasOpenRouterKey ? `<div class="apikey-current" id="openrouter-key-current">Aktuell: ${maskedOpenRouterKey}</div>` : ''}
                <div class="apikey-input-group">
                    <label for="openrouter-apikey-input">Neuer OpenRouter API Key:</label>
                    <input type="password" id="openrouter-apikey-input"
                           placeholder="sk-or-v1-..."
                           autocomplete="off"
                           spellcheck="false">
                    <button id="openrouter-apikey-toggle" class="apikey-toggle" title="Anzeigen/Verbergen">
                        👁
                    </button>
                </div>

                <h4 style="margin-top: 20px;">Google Gemini API Key</h4>
                <p class="apikey-info">
                    Der API Key wird verschlüsselt gespeichert.<br>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" class="apikey-link">API Key bei Google AI Studio erstellen</a>
                </p>
                <div class="apikey-status ${hasGeminiKey ? 'has-key' : 'no-key'}">
                    ${hasGeminiKey ? '✓ Gemini API Key ist gesetzt' : '✗ Gemini API Key nicht konfiguriert'}
                </div>
                ${hasGeminiKey ? `<div class="apikey-current" id="gemini-key-current">Aktuell: ${maskedGeminiKey}</div>` : ''}
                <div class="apikey-input-group">
                    <label for="gemini-apikey-input">Neuer Gemini API Key:</label>
                    <input type="password" id="gemini-apikey-input"
                           placeholder="AIza..."
                           autocomplete="off"
                           spellcheck="false">
                    <button id="gemini-apikey-toggle" class="apikey-toggle" title="Anzeigen/Verbergen">
                        👁
                    </button>
                </div>
            </div>
            <div class="dialog-footer">
                <button id="apikey-dialog-cancel" class="btn btn-secondary">Abbrechen</button>
                <button id="apikey-dialog-save" class="btn btn-primary">Speichern</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // OpenRouter elements
    const openRouterInput = document.getElementById('openrouter-apikey-input');
    const openRouterToggleBtn = document.getElementById('openrouter-apikey-toggle');
    const openRouterKeyCurrent = document.getElementById('openrouter-key-current');

    // Gemini elements
    const geminiInput = document.getElementById('gemini-apikey-input');
    const geminiToggleBtn = document.getElementById('gemini-apikey-toggle');
    const geminiKeyCurrent = document.getElementById('gemini-key-current');

    const saveBtn = document.getElementById('apikey-dialog-save');

    // Toggle OpenRouter password visibility
    openRouterToggleBtn.addEventListener('click', () => {
        if (openRouterInput.type === 'password') {
            openRouterInput.type = 'text';
            openRouterToggleBtn.textContent = '🙈';
            if (openRouterKeyCurrent) openRouterKeyCurrent.textContent = 'Aktuell: ' + currentOpenRouterKey;
        } else {
            openRouterInput.type = 'password';
            openRouterToggleBtn.textContent = '👁';
            if (openRouterKeyCurrent) openRouterKeyCurrent.textContent = 'Aktuell: ' + maskedOpenRouterKey;
        }
    });

    // Toggle Gemini password visibility
    geminiToggleBtn.addEventListener('click', () => {
        if (geminiInput.type === 'password') {
            geminiInput.type = 'text';
            geminiToggleBtn.textContent = '🙈';
            if (geminiKeyCurrent) geminiKeyCurrent.textContent = 'Aktuell: ' + currentGeminiKey;
        } else {
            geminiInput.type = 'password';
            geminiToggleBtn.textContent = '👁';
            if (geminiKeyCurrent) geminiKeyCurrent.textContent = 'Aktuell: ' + maskedGeminiKey;
        }
    });

    // Close handlers
    document.getElementById('apikey-dialog-close').addEventListener('click', () => overlay.remove());
    document.getElementById('apikey-dialog-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Save handler
    saveBtn.addEventListener('click', async () => {
        const newOpenRouterKey = openRouterInput.value.trim();
        const newGeminiKey = geminiInput.value.trim();
        let changesMade = false;

        // Save OpenRouter Key
        if (newOpenRouterKey) {
            if (!newOpenRouterKey.startsWith('sk-')) {
                alert('OpenRouter: Ungültiges Format. Keys beginnen mit "sk-".');
                return;
            }
            try {
                await SetOpenRouterApiKey(newOpenRouterKey);
                changesMade = true;
            } catch (err) {
                alert('OpenRouter: Fehler beim Speichern: ' + err);
                return;
            }
        } else if (currentOpenRouterKey && openRouterInput.value === '') { // Allow clearing the key
             await SetOpenRouterApiKey(''); // Clear existing key
             changesMade = true;
        }

        // Save Gemini Key
        if (newGeminiKey) {
            if (!newGeminiKey.startsWith('AIza')) { // Gemini API keys typically start with AIza
                alert('Gemini: Ungültiges Format. Keys beginnen mit "AIza".');
                return;
            }
            try {
                await SetGeminiApiKey(newGeminiKey);
                changesMade = true;
            } catch (err) {
                alert('Gemini: Fehler beim Speichern: ' + err);
                return;
            }
        } else if (currentGeminiKey && geminiInput.value === '') { // Allow clearing the key
             await SetGeminiApiKey(''); // Clear existing key
             changesMade = true;
        }

        if (changesMade) {
            alert('API Key(s) wurden gespeichert!');
        } else {
            alert('Keine Änderungen vorgenommen.');
        }
        overlay.remove();
    });

    // Focus on the first empty input, or OpenRouter if both have keys
    if (!hasOpenRouterKey) {
        openRouterInput.focus();
    } else if (!hasGeminiKey) {
        geminiInput.focus();
    } else {
        openRouterInput.focus();
    }
}
