import { SetOpenRouterApiKey, GetOpenRouterApiKey, HasOpenRouterApiKey } from '../../wailsjs/go/main/App.js';

export async function showApiKeyDialog() {
    const existing = document.getElementById('apikey-dialog-overlay');
    if (existing) existing.remove();

    // Get current key status
    const hasKey = await HasOpenRouterApiKey();
    const currentKey = hasKey ? await GetOpenRouterApiKey() : '';

    // Mask the key for display (show only last 4 chars)
    const maskedKey = currentKey ? '••••••••••••' + currentKey.slice(-4) : '';
 
    const overlay = document.createElement('div');
    overlay.id = 'apikey-dialog-overlay';
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
        <div class="dialog apikey-dialog">
            <div class="dialog-header">
                <h3>OpenRouter API Key</h3>
                <button class="dialog-close" id="apikey-dialog-close">&times;</button>
            </div>
            <div class="dialog-body">
                <p class="apikey-info">
                    Der API Key wird verschlüsselt gespeichert.<br>
                    <a href="https://openrouter.ai/keys" target="_blank" class="apikey-link">API Key bei OpenRouter erstellen</a>
                </p>
                <div class="apikey-status ${hasKey ? 'has-key' : 'no-key'}">
                    ${hasKey ? '✓ API Key ist gesetzt' : '✗ Kein API Key konfiguriert'}
                </div>
                ${hasKey ? `<div class="apikey-current">Aktuell: ${maskedKey}</div>` : ''}
                <div class="apikey-input-group">
                    <label for="apikey-input">Neuer API Key:</label>
                    <input type="password" id="apikey-input"
                           placeholder="sk-or-v1-..."
                           autocomplete="off"
                           spellcheck="false">
                    <button id="apikey-toggle" class="apikey-toggle" title="Anzeigen/Verbergen">
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

    const input = document.getElementById('apikey-input');
    const toggleBtn = document.getElementById('apikey-toggle');
    const saveBtn = document.getElementById('apikey-dialog-save');
    const keycurrent = document.querySelector('.apikey-current');
    console.log("Keycurrent element:", keycurrent);

    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.textContent = '🙈';
            keycurrent.textContent = 'Aktuell: ' + currentKey;
        } else {
            input.type = 'password';
            toggleBtn.textContent = '👁';
            keycurrent.textContent = 'Aktuell: ' + maskedKey;
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
        const newKey = input.value.trim();
        if (!newKey) {
            alert('Bitte einen API Key eingeben.');
            return;
        }

        if (!newKey.startsWith('sk-')) {
            alert('Ungültiges Format. OpenRouter Keys beginnen mit "sk-".');
            return;
        }

        try {
            await SetOpenRouterApiKey(newKey);
            alert('API Key wurde gespeichert!');
            overlay.remove();
        } catch (err) {
            alert('Fehler beim Speichern: ' + err);
        }
    });

    // Focus input
    input.focus();

    // Enter key to save
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
}
