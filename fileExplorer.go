// fileExplorer.go — Verzeichnis-Listing für den Datei-Explorer.
// Wird vom Frontend über Wails-Bindings aufgerufen:
//   window.go.main.App.ListDirectory(path) → Verzeichnisinhalt
//   window.go.main.App.GetHomeDirectory()  → Home-Verzeichnis
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// FileEntry beschreibt eine einzelne Datei oder einen Ordner.
type FileEntry struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	IsDirectory bool   `json:"isDirectory"`
	Size        int64  `json:"size"`
	Extension   string `json:"extension"`
}

// DirectoryResult ist das Ergebnis von ListDirectory.
type DirectoryResult struct {
	Path    string      `json:"path"`
	Parent  string      `json:"parent"`
	Entries []FileEntry `json:"entries"`
	Error   string      `json:"error"`
}

// ListDirectory liest den Inhalt eines Verzeichnisses.
// Versteckte Dateien (mit Punkt am Anfang) werden übersprungen.
// Sortierung: Ordner zuerst, dann Dateien — jeweils alphabetisch.
func (a *App) ListDirectory(path string) DirectoryResult {
	if path == "" {
		path = a.GetHomeDirectory()
	}

	// Pfad normalisieren
	path, err := filepath.Abs(path)
	if err != nil {
		return DirectoryResult{Error: "Ungültiger Pfad: " + err.Error()}
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return DirectoryResult{Error: "Verzeichnis konnte nicht gelesen werden: " + err.Error()}
	}

	var fileEntries []FileEntry
	for _, entry := range entries {
		name := entry.Name()

		// Versteckte Dateien überspringen
		if strings.HasPrefix(name, ".") {
			continue
		}

		fullPath := filepath.Join(path, name)
		info, err := entry.Info()
		if err != nil {
			continue
		}

		fe := FileEntry{
			Name:        name,
			Path:        fullPath,
			IsDirectory: entry.IsDir(),
			Size:        info.Size(),
		}

		if !entry.IsDir() {
			ext := filepath.Ext(name)
			if ext != "" {
				fe.Extension = strings.TrimPrefix(ext, ".")
			}
		}

		fileEntries = append(fileEntries, fe)
	}

	// Sortierung: Ordner zuerst, dann Dateien, jeweils alphabetisch (case-insensitive)
	sort.Slice(fileEntries, func(i, j int) bool {
		if fileEntries[i].IsDirectory != fileEntries[j].IsDirectory {
			return fileEntries[i].IsDirectory
		}
		return strings.ToLower(fileEntries[i].Name) < strings.ToLower(fileEntries[j].Name)
	})

	parent := filepath.Dir(path)
	if parent == path {
		parent = "" // Wir sind am Root-Verzeichnis
	}

	return DirectoryResult{
		Path:    path,
		Parent:  parent,
		Entries: fileEntries,
	}
}

// GetHomeDirectory gibt das Home-Verzeichnis des Benutzers zurück.
func (a *App) GetHomeDirectory() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "/"
	}
	return home
}

// RenameFile benennt eine Datei oder einen Ordner um.
func (a *App) RenameFile(oldPath, newPath string) error {
	if oldPath == "" || newPath == "" {
		return fmt.Errorf("Pfad darf nicht leer sein")
	}

	if _, err := os.Stat(oldPath); os.IsNotExist(err) {
		return fmt.Errorf("Quelle existiert nicht: %s", oldPath)
	}

	if _, err := os.Stat(newPath); err == nil {
		return fmt.Errorf("Ziel existiert bereits: %s", filepath.Base(newPath))
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		return fmt.Errorf("Umbenennen fehlgeschlagen: %w", err)
	}

	return nil
}

// DeleteFile löscht eine Datei oder einen Ordner (inkl. Inhalt).
func (a *App) DeleteFile(path string) error {
	if path == "" {
		return fmt.Errorf("Pfad darf nicht leer sein")
	}

	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("Ungültiger Pfad: %w", err)
	}

	// Sicherheitscheck: Root- und Home-Verzeichnis nicht löschen
	home := a.GetHomeDirectory()
	if absPath == "/" || absPath == home {
		return fmt.Errorf("Dieses Verzeichnis darf nicht gelöscht werden")
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return fmt.Errorf("Datei existiert nicht: %s", absPath)
	}

	if err := os.RemoveAll(absPath); err != nil {
		return fmt.Errorf("Löschen fehlgeschlagen: %w", err)
	}

	return nil
}
