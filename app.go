// app.go — Zentrale App-Struktur und Lifecycle-Hooks.
// Die App-Struct hält den gesamten Anwendungszustand (Kontext, Konfiguration)
// und wird per Wails-Binding an das Frontend gebunden.
package main

import (
	"context"
	"fmt"

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

// domReady wird aufgerufen, sobald das Frontend (HTML/JS) vollständig geladen ist.
// Hier wird der Drag-and-Drop-Handler registriert, der Dateien vom
// Betriebssystem entgegennimmt und an das Frontend weiterleitet.
func (a *App) domReady(ctx context.Context) {
	// OnFileDrop: Wails fängt Datei-Drops auf dem Fenster ab.
	// x, y: Mausposition des Drops (hier nicht verwendet).
	// paths: Liste der abgelegten Dateipfade.
	runtime.OnFileDrop(ctx, func(x, y int, paths []string) {
		fmt.Printf("Files dropped: %v\n", paths)

		// Deduplizierung: Auf manchen Systemen (besonders Linux/WebKit)
		// kann dasselbe Drop-Event mehrfach den gleichen Pfad enthalten.
		seen := make(map[string]bool)
		var uniquePaths []string

		for _, path := range paths {
			if _, exists := seen[path]; !exists {
				seen[path] = true
				uniquePaths = append(uniquePaths, path)

				// Jeder Pfad wird einzeln als Event an das Frontend gesendet.
				// Das Frontend lauscht auf "file-drop" und öffnet die Datei in einem neuen Tab.
				runtime.EventsEmit(ctx, "file-drop", path)
			}
		}

		fmt.Printf("Unique files processed: %v\n", uniquePaths)
	})
}
