// app.go — Zentrale App-Struktur und Lifecycle-Hooks.
// Die App-Struct hält den gesamten Anwendungszustand (Kontext, Konfiguration)
// und wird per Wails-Binding an das Frontend gebunden.
package main

import (
	"context"
	"fmt"
	"os"
	"os/exec" // Import the os/exec package
	"strings" // Import the strings package for potential trimming

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App ist die Hauptstruktur der Anwendung.
// ctx: Der Wails-Kontext — wird für alle Wails-Runtime-Aufrufe benötigt
//
//	(Dialoge, Events, Fenster-Steuerung).
//
// initialFiles: Dateipfade, die per Kommandozeile übergeben wurden.
// Config: Persistierte Einstellungen (Schriftart, zuletzt geöffnete Dateien, API-Key).
type App struct {
	ctx          context.Context
	initialFiles []string
	configPath   string
	Config       AppConfig
}

// AskGeminiForSuggestions provides coding suggestions using Gemini.
func (a *App) AskGeminiForSuggestions(selectedText string, fileType string, fullContent string) (string, error) {
	// 1. Retrieve the decrypted Gemini API key
	apiKey := a.GetGeminiApiKey()
	if apiKey == "" {
		return "", fmt.Errorf("Gemini API Key is not configured. Please set it in Preferences.")
	}

	// Restore original detailed prompt
	prompt := fmt.Sprintf("Analyze the following %s code. Provide suggestions for code completion, refactoring, or bug fixes. If a change is suggested, output only the modified code block to replace the selected text. Do not include any conversational text or explanations, just the code block. If no changes are needed or cannot be made, return the original selected code.\n\nFull context:\n```%s\n%s\n```\n\nSelected code to improve:\n```%s\n%s\n```\n\nSuggestions:", fileType, fileType, fullContent, fileType, selectedText)

	// Log the prompt for debugging
	fmt.Printf("Gemini Prompt:\n%s\n", prompt)

	// 2. Execute the gemini command with proper environment
	// Set API key as environment variable
	cmd := exec.Command("gemini", "--prompt", prompt)

	// Set API key in environment
	cmd.Env = append(os.Environ(), fmt.Sprintf("GEMINI_API_KEY=%s", apiKey))

	fmt.Printf("Executing gemini command: gemini --prompt <prompt>\n")

	output, err := cmd.CombinedOutput()
	rawOutput := string(output)
	fmt.Printf("Gemini Command Raw Output:\n%s\n", rawOutput)

	if err != nil {
		return "", fmt.Errorf("failed to run gemini command: %w\nGemini Output: %s", err, rawOutput)
	}

	return strings.TrimSpace(rawOutput), nil
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{}
	app.configPath = app.getConfigPath()
	app.Config.MaxRecentFiles = 10
	app.loadConfig()
	return app
}

// SetInitialFiles speichert die Dateipfade von der Befehlszeile
func (a *App) SetInitialFiles(files []string) {
	a.initialFiles = files
}

// GetStartupFiles gibt die Dateipfade zurück, die per Befehlszeile übergeben wurden
func (a *App) GetStartupFiles() []string {
	return a.initialFiles
}

// startup wird von Wails aufgerufen, sobald die App startet.
// Der Kontext wird gespeichert, da er für alle Wails-Runtime-Methoden
// benötigt wird (z.B. Dialoge öffnen, Events senden).
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// shutdown wird von Wails beim Beenden der App aufgerufen.
func (a *App) shutdown(ctx context.Context) {
}

// domReady wird aufgerufen, sobald das Frontend (HTML/JS) vollständig geladen ist.
func (a *App) domReady(ctx context.Context) {
	runtime.OnFileDrop(ctx, func(x, y int, paths []string) {
		fmt.Printf("Files dropped: %v\n", paths)
		seen := make(map[string]bool)
		for _, path := range paths {
			if !seen[path] {
				seen[path] = true
				runtime.EventsEmit(ctx, "file-drop", path)
			}
		}
	})
}
