// main.go — Einstiegspunkt der Leoedit-Anwendung.
// Hier wird das Wails-Framework konfiguriert und die App gestartet.
// Wails verbindet Go-Backend (Dateioperationen, API) mit dem
// JavaScript-Frontend (CodeMirror-Editor, Menüs, Tabs).
package main

import (
	"embed"
	"os"
	"runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

// Embed-Direktiven: Bettet Dateien zur Compile-Zeit in die Go-Binary ein,
// sodass die App als einzelne ausführbare Datei verteilt werden kann.
//
//go:embed build/appicon.png
var icon []byte

//go:embed all:frontend/dist
//go:embed build/*/*
var assets embed.FS

func main() {

	// Unter Linux/WebKit ist das Rechtsklick-Kontextmenü standardmäßig
	// deaktiviert. Diese Umgebungsvariable aktiviert es explizit.
	if runtime.GOOS == "linux" {
		if os.Getenv("WEBKIT_DISABLE_CONTEXT_MENU") == "" {
			os.Setenv("WEBKIT_DISABLE_CONTEXT_MENU", "0")
		}
	}

	// Dateipfade aus CLI-Argumenten sammeln
	files := os.Args[1:]

	// Single-Instance-Prüfung: Versuche Dateien an eine bereits laufende
	// Instanz zu senden. Falls erfolgreich, beendet sich diese Instanz.
	if tryConnectExisting(files) {
		os.Exit(0)
	}

	// App-Instanz erstellen (definiert in app.go)
	app := NewApp()

	// Falls Dateipfade per Kommandozeile übergeben wurden (z.B. "leoedit datei.txt"),
	// werden diese gespeichert und beim Start im Frontend geöffnet.
	if len(files) > 0 {
		app.SetInitialFiles(files)
	}

	// Wails-Anwendung konfigurieren und starten.
	// Die wichtigsten Optionen:
	// - AssetServer: Liefert das eingebettete Frontend aus
	// - DragAndDrop: Ermöglicht Datei-Drop aus dem Dateimanager
	// - Bind: Macht Go-Methoden im Frontend aufrufbar (window.go.main.App.*)
	// - OnStartup/OnDomReady: Lifecycle-Hooks für Initialisierung
	err := wails.Run(&options.App{
		Title:                    "Leoedit",
		Width:                    1024,
		Height:                   768,
		EnableDefaultContextMenu: true,
		AssetServer: &assetserver.Options{
			Assets: assets, // Haupt-Frontend aus dist
		},
		Linux: &linux.Options{
			Icon:                icon,
			WindowIsTranslucent: false,
			WebviewGpuPolicy:    linux.WebviewGpuPolicyAlways,
			ProgramName:         "Leoedit",
		},
		Frameless:        false,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: false,
		},
		OnStartup:  app.startup,
		OnDomReady: app.domReady,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
		Debug: options.Debug{
			OpenInspectorOnStartup: false,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
