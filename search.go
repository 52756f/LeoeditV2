// search.go — Dateisuche für den Search Panel.
// Durchsucht Dateien in einem Verzeichnis nach einem Suchbegriff.
package main

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// SearchMatch beschreibt einen Treffer in einer Datei.
type SearchMatch struct {
	FilePath   string `json:"filePath"`
	FileName   string `json:"fileName"`
	LineNumber int    `json:"lineNumber"`
	LineText   string `json:"lineText"`
	MatchStart int    `json:"matchStart"` // Position des Treffers in der Zeile
}

// SearchResult ist das Ergebnis einer Suche.
type SearchResult struct {
	Query      string        `json:"query"`
	RootPath   string        `json:"rootPath"`
	Matches    []SearchMatch `json:"matches"`
	TotalFiles int           `json:"totalFiles"`
	Error      string        `json:"error"`
}

// Maximale Anzahl von Treffern um Performance zu schützen
const maxSearchMatches = 500

// Dateierweiterungen die durchsucht werden (Textdateien)
var searchableExtensions = map[string]bool{
	".txt": true, ".md": true, ".json": true, ".xml": true, ".yaml": true, ".yml": true,
	".js": true, ".ts": true, ".jsx": true, ".tsx": true, ".mjs": true, ".cjs": true,
	".html": true, ".htm": true, ".css": true, ".scss": true, ".sass": true, ".less": true,
	".py": true, ".go": true, ".java": true, ".c": true, ".cpp": true, ".h": true, ".hpp": true,
	".rs": true, ".rb": true, ".php": true, ".sh": true, ".bash": true, ".zsh": true,
	".sql": true, ".graphql": true, ".vue": true, ".svelte": true,
	".env": true, ".gitignore": true, ".dockerignore": true,
	".toml": true, ".ini": true, ".cfg": true, ".conf": true,
}

// Ordner die übersprungen werden
var skipDirectories = map[string]bool{
	"node_modules": true, ".git": true, ".svn": true, ".hg": true,
	"vendor": true, "dist": true, "build": true, ".next": true,
	"__pycache__": true, ".pytest_cache": true, ".tox": true,
	"target": true, "bin": true, "obj": true,
}

// SearchInDirectory durchsucht alle Textdateien in einem Verzeichnis.
func (a *App) SearchInDirectory(rootPath, query string, caseSensitive bool) SearchResult {
	if query == "" {
		return SearchResult{Error: "Suchbegriff darf nicht leer sein"}
	}

	rootPath, err := filepath.Abs(rootPath)
	if err != nil {
		return SearchResult{Error: "Ungültiger Pfad: " + err.Error()}
	}

	result := SearchResult{
		Query:    query,
		RootPath: rootPath,
		Matches:  []SearchMatch{},
	}

	searchQuery := query
	if !caseSensitive {
		searchQuery = strings.ToLower(query)
	}

	err = filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Fehler ignorieren, weitermachen
		}

		// Ordner überspringen
		if info.IsDir() {
			if skipDirectories[info.Name()] {
				return filepath.SkipDir
			}
			return nil
		}

		// Versteckte Dateien überspringen
		if strings.HasPrefix(info.Name(), ".") && info.Name() != ".env" &&
		   info.Name() != ".gitignore" && info.Name() != ".dockerignore" {
			return nil
		}

		// Nur durchsuchbare Dateien
		ext := strings.ToLower(filepath.Ext(path))
		if ext == "" {
			// Dateien ohne Extension prüfen (Dockerfile, Makefile, etc.)
			baseName := strings.ToLower(info.Name())
			if baseName != "dockerfile" && baseName != "makefile" &&
			   baseName != "readme" && baseName != "license" {
				return nil
			}
		} else if !searchableExtensions[ext] {
			return nil
		}

		// Zu große Dateien überspringen (> 1MB)
		if info.Size() > 1024*1024 {
			return nil
		}

		// Datei durchsuchen
		matches := searchFile(path, searchQuery, caseSensitive)
		result.Matches = append(result.Matches, matches...)
		result.TotalFiles++

		// Limit erreicht?
		if len(result.Matches) >= maxSearchMatches {
			return filepath.SkipAll
		}

		return nil
	})

	if err != nil && err != filepath.SkipAll {
		result.Error = "Suchfehler: " + err.Error()
	}

	return result
}

// searchFile durchsucht eine einzelne Datei.
func searchFile(filePath, query string, caseSensitive bool) []SearchMatch {
	var matches []SearchMatch

	file, err := os.Open(filePath)
	if err != nil {
		return matches
	}
	defer file.Close()

	fileName := filepath.Base(filePath)
	scanner := bufio.NewScanner(file)
	lineNumber := 0

	for scanner.Scan() {
		lineNumber++
		lineText := scanner.Text()

		searchLine := lineText
		if !caseSensitive {
			searchLine = strings.ToLower(lineText)
		}

		matchStart := strings.Index(searchLine, query)
		if matchStart >= 0 {
			// Zeile kürzen wenn zu lang
			displayText := lineText
			if len(displayText) > 200 {
				// Versuche den Match sichtbar zu halten
				start := matchStart - 50
				if start < 0 {
					start = 0
				}
				end := start + 200
				if end > len(displayText) {
					end = len(displayText)
				}
				displayText = displayText[start:end]
				if start > 0 {
					displayText = "..." + displayText
					matchStart = matchStart - start + 3
				}
				if end < len(lineText) {
					displayText = displayText + "..."
				}
			}

			matches = append(matches, SearchMatch{
				FilePath:   filePath,
				FileName:   fileName,
				LineNumber: lineNumber,
				LineText:   strings.TrimSpace(displayText),
				MatchStart: matchStart,
			})
		}
	}

	return matches
}
