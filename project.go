// project.go — Projektverwaltung für den Project Explorer.
// Ein Projekt ist ein Ordner mit einer .leoedit.json Konfigurationsdatei.
// Der Project Explorer ist auf den Projektordner beschränkt (kein Navigieren nach oben).
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ProjectConfig beschreibt die .leoedit.json Datei im Projektstamm.
type ProjectConfig struct {
	Name       string `json:"name"`
	RootPath   string `json:"rootPath"`
	Version    string `json:"version"`
	Created    string `json:"created"`
	LastOpened string `json:"lastOpened"`
}

const projectConfigFile = ".leoedit.json"
const projectConfigVersion = "1.0"

// GetRecentProjects gibt die Liste der kürzlich geöffneten Projekte zurück.
func (a *App) GetRecentProjects() []RecentProject {
	if a.Config.RecentProjects == nil {
		return []RecentProject{}
	}
	return a.Config.RecentProjects
}

// AddRecentProject fügt ein Projekt zur Liste der kürzlich geöffneten Projekte hinzu.
// Duplikate (nach Pfad) werden vermieden, max 10 Einträge, neueste oben.
func (a *App) AddRecentProject(name, path string) {
	// Bestehenden Eintrag mit gleichem Pfad entfernen
	projects := make([]RecentProject, 0, len(a.Config.RecentProjects))
	for _, p := range a.Config.RecentProjects {
		if p.Path != path {
			projects = append(projects, p)
		}
	}

	// Neuen Eintrag am Anfang einfügen
	projects = append([]RecentProject{{Name: name, Path: path}}, projects...)

	// Max 10 Einträge
	if len(projects) > 10 {
		projects = projects[:10]
	}

	a.Config.RecentProjects = projects
	a.saveConfig()
}

// RemoveRecentProject entfernt ein Projekt aus der Liste der kürzlich geöffneten Projekte.
func (a *App) RemoveRecentProject(path string) {
	projects := make([]RecentProject, 0, len(a.Config.RecentProjects))
	for _, p := range a.Config.RecentProjects {
		if p.Path != path {
			projects = append(projects, p)
		}
	}
	a.Config.RecentProjects = projects
	a.saveConfig()
}

// CreateProject erstellt eine neue .leoedit.json im angegebenen Ordner.
func (a *App) CreateProject(folderPath, projectName string) (*ProjectConfig, error) {
	// Pfad normalisieren
	folderPath, err := filepath.Abs(folderPath)
	if err != nil {
		return nil, fmt.Errorf("ungültiger Pfad: %w", err)
	}

	// Prüfen ob Ordner existiert
	info, err := os.Stat(folderPath)
	if err != nil {
		return nil, fmt.Errorf("Ordner nicht gefunden: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("Pfad ist kein Ordner: %s", folderPath)
	}

	// Prüfen ob bereits ein Projekt existiert
	configPath := filepath.Join(folderPath, projectConfigFile)
	if _, err := os.Stat(configPath); err == nil {
		return nil, fmt.Errorf("Projekt existiert bereits in diesem Ordner")
	}

	// Neues Projekt erstellen
	now := time.Now().Format(time.RFC3339)
	config := &ProjectConfig{
		Name:       projectName,
		RootPath:   folderPath,
		Version:    projectConfigVersion,
		Created:    now,
		LastOpened: now,
	}

	// Speichern
	if err := a.saveProjectConfig(configPath, config); err != nil {
		return nil, err
	}

	a.AddRecentProject(config.Name, config.RootPath)

	return config, nil
}

// OpenProject öffnet ein bestehendes Projekt und aktualisiert lastOpened.
func (a *App) OpenProject(folderPath string) (*ProjectConfig, error) {
	// Pfad normalisieren
	folderPath, err := filepath.Abs(folderPath)
	if err != nil {
		return nil, fmt.Errorf("ungültiger Pfad: %w", err)
	}

	configPath := filepath.Join(folderPath, projectConfigFile)

	// Konfiguration lesen
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("Projektdatei nicht gefunden: %w", err)
	}

	var config ProjectConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("Projektdatei ungültig: %w", err)
	}

	// RootPath aktualisieren (falls Ordner verschoben wurde)
	config.RootPath = folderPath

	// lastOpened aktualisieren
	config.LastOpened = time.Now().Format(time.RFC3339)

	// Speichern
	if err := a.saveProjectConfig(configPath, &config); err != nil {
		return nil, err
	}

	a.AddRecentProject(config.Name, config.RootPath)

	return &config, nil
}

// SelectProjectFolder öffnet einen nativen Ordner-Auswahl-Dialog.
func (a *App) SelectProjectFolder() (string, error) {
	folder, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Projektordner auswählen",
	})
	if err != nil {
		return "", err
	}
	return folder, nil
}

// CheckProjectExists prüft ob ein .leoedit.json im Ordner existiert.
func (a *App) CheckProjectExists(folderPath string) bool {
	configPath := filepath.Join(folderPath, projectConfigFile)
	_, err := os.Stat(configPath)
	return err == nil
}

// ListProjectDirectory listet ein Verzeichnis innerhalb eines Projekts.
// Verhindert Navigation außerhalb des Projektstamms.
func (a *App) ListProjectDirectory(path, projectRoot string) DirectoryResult {
	// Pfade normalisieren
	path, err := filepath.Abs(path)
	if err != nil {
		return DirectoryResult{Error: "Ungültiger Pfad: " + err.Error()}
	}

	projectRoot, err = filepath.Abs(projectRoot)
	if err != nil {
		return DirectoryResult{Error: "Ungültiger Projektstamm: " + err.Error()}
	}

	// Sicherheitsprüfung: Pfad muss innerhalb des Projektstamms sein
	if !isPathWithinRoot(path, projectRoot) {
		return DirectoryResult{Error: "Zugriff außerhalb des Projekts nicht erlaubt"}
	}

	// Normales Verzeichnis-Listing verwenden
	result := a.ListDirectory(path)

	// Parent anpassen: Leer wenn wir am Projektstamm sind
	if path == projectRoot {
		result.Parent = ""
	} else if result.Parent != "" && !isPathWithinRoot(result.Parent, projectRoot) {
		// Parent wäre außerhalb des Projekts → auf Projektstamm setzen
		result.Parent = projectRoot
	}

	return result
}

// saveProjectConfig speichert die Projektkonfiguration.
func (a *App) saveProjectConfig(configPath string, config *ProjectConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("Fehler beim Serialisieren: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("Fehler beim Speichern: %w", err)
	}

	return nil
}

// isPathWithinRoot prüft ob ein Pfad innerhalb eines Wurzelverzeichnisses liegt.
func isPathWithinRoot(path, root string) bool {
	// Beide Pfade normalisieren und mit Slash beenden für korrekten Vergleich
	path = filepath.Clean(path)
	root = filepath.Clean(root)

	// Pfad muss mit Root beginnen
	if path == root {
		return true
	}

	// Pfad muss Root + Separator enthalten
	return strings.HasPrefix(path, root+string(filepath.Separator))
}
