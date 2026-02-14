// config.go — Persistierte Anwendungseinstellungen.
// Die Konfiguration wird als JSON-Datei im Benutzer-Konfigurationsverzeichnis
// gespeichert (z.B. ~/.config/Leoedit/config.json unter Linux).
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// RecentProject speichert Name und Pfad eines kürzlich geöffneten Projekts.
type RecentProject struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// AppConfig enthält alle Einstellungen, die zwischen Sitzungen gespeichert werden.
// Der OpenRouterApiKey wird verschlüsselt gespeichert (siehe encryption.go).
type AppConfig struct {
	RecentFiles      []string        `json:"recent_files"`
	LastDirectory    string          `json:"last_directory"`
	MaxRecentFiles   int             `json:"max_recent_files"`
	EditorFont       string          `json:"editor_font"`
	EditorFontSize   int             `json:"editor_font_size"`
	OpenRouterApiKey string          `json:"openrouter_api_key"` // AES-GCM verschlüsselt
	RecentProjects   []RecentProject `json:"recent_projects"`
}

// getConfigPath gibt den Pfad zur Konfigurationsdatei zurück
func (a *App) getConfigPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "Leoedit")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to create config directory %s: %v\n", appDir, err)
	}
	return filepath.Join(appDir, "config.json")
}

// loadConfig lädt die Konfiguration von der Festplatte
func (a *App) loadConfig() {
	data, err := os.ReadFile(a.configPath)
	if err != nil {
		a.Config = AppConfig{
			RecentFiles:    []string{},
			MaxRecentFiles: 10,
		}
		return
	}

	err = json.Unmarshal(data, &a.Config)
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		a.Config = AppConfig{
			RecentFiles:    []string{},
			MaxRecentFiles: 10,
		}
	}
}

// saveConfig speichert die Konfiguration auf die Festplatte
func (a *App) saveConfig() error {
	data, err := json.MarshalIndent(a.Config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.configPath, data, 0644)
}

// EditorSettings wird vom Frontend verwendet
type EditorSettings struct {
	Font     string `json:"font"`
	FontSize int    `json:"fontSize"`
}

// GetEditorSettings gibt die aktuellen Editor-Einstellungen zurück
func (a *App) GetEditorSettings() EditorSettings {
	font := a.Config.EditorFont
	if font == "" {
		font = "JetBrains Mono, monospace"
	}
	fontSize := a.Config.EditorFontSize
	if fontSize == 0 {
		fontSize = 14
	}
	return EditorSettings{
		Font:     font,
		FontSize: fontSize,
	}
}

// SetEditorSettings speichert die Editor-Einstellungen
func (a *App) SetEditorSettings(font string, fontSize int) error {
	a.Config.EditorFont = font
	a.Config.EditorFontSize = fontSize
	return a.saveConfig()
}
