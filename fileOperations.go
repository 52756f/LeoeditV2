// fileOperations.go — Alle Dateioperationen (Lesen, Speichern, Dialoge).
// Diese Funktionen werden vom Frontend über Wails-Bindings aufgerufen:
//   window.go.main.App.LoadFile()      → Öffnen-Dialog
//   window.go.main.App.SaveFile()      → Direkt speichern
//   window.go.main.App.SaveFileUnder() → Speichern-unter-Dialog
//   window.go.main.App.ReadTextFile()  → Textdatei ohne Dialog lesen
//   window.go.main.App.ReadBinaryFile()→ Binärdatei als Base64 lesen (Bilder, PDFs)
//
// Alle Ergebnisse werden als JSON-Structs zurückgegeben, die Wails
// automatisch in JavaScript-Objekte konvertiert.
package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// BinaryFileResult: Ergebnis beim Lesen einer Binärdatei.
// Data enthält den Inhalt als Base64-String, damit er im Frontend
// als data-URI (z.B. für <img src="data:image/png;base64,...">)
// verwendet werden kann.
type BinaryFileResult struct {
	Data     string `json:"data"`     // Base64-kodierter Dateiinhalt
	MimeType string `json:"mimeType"` // Erkannter MIME-Typ (z.B. "image/png")
	IsImage  bool   `json:"isImage"`  // true wenn Bilddatei
	IsPdf    bool   `json:"isPdf"`    // true wenn PDF
	Error    string `json:"error"`    // Fehlermeldung (leer bei Erfolg)
}

// SaveResult: Ergebnis einer Speicher-Operation.
type SaveResult struct {
	Success bool   `json:"success"`
	Path    string `json:"path"`            // Vollständiger Dateipfad
	Title   string `json:"title"`           // Nur der Dateiname (für Tab-Titel)
	Message string `json:"message,omitempty"`
}

// SaveRequest: Eingabedaten für "Speichern unter" (kommt als JSON vom Frontend).
type SaveRequest struct {
	Content     string `json:"content"`
	DefaultPath string `json:"defaultPath"`
}

// FileResult: Ergebnis beim Lesen einer Textdatei.
// JSON-Tags sorgen dafür, dass Wails die Felder korrekt ans Frontend übergibt.
type FileResult struct {
	Content  string `json:"content"`
	Filename string `json:"filename"`
	Error    string `json:"error"`
}

func (a *App) SaveFileUnder(jsonInput string) SaveResult {
	var req SaveRequest
	if err := json.Unmarshal([]byte(jsonInput), &req); err != nil {
		return SaveResult{Success: false, Message: "Ungültige Daten"}
	}

	filename, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Datei speichern unter",
		DefaultFilename: req.DefaultPath,
		Filters: []runtime.FileFilter{
			{DisplayName: "Textdateien", Pattern: "*.txt;*.md;*.*"},
		},
	})

	if err != nil || filename == "" {
		return SaveResult{Success: false, Message: "Abgebrochen"}
	}

	if err := os.WriteFile(filename, []byte(req.Content), 0644); err != nil {
		return SaveResult{Success: false, Message: err.Error()}
	}

	return SaveResult{
		Success: true,
		Path:    filename,
		Title:   filepath.Base(filename), // Extrahiert den Dateinamen für den Tab-Titel
	}
}

// ReadTextFile liest eine Textdatei direkt über den Pfad (ohne Dialog)
func (a *App) ReadTextFile(path string) FileResult {
	data, err := os.ReadFile(path)
	if err != nil {
		return FileResult{Error: fmt.Sprintf("Fehler beim Lesen: %v", err)}
	}
	return FileResult{
		Content:  string(data),
		Filename: path,
	}
}

// LoadFile öffnet einen Datei-Dialog
func (a *App) LoadFile() FileResult {
	filename, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Datei öffnen",
		Filters: []runtime.FileFilter{
			{DisplayName: "Textdateien", Pattern: "*.txt;*.md;*.log;*.*"},
		},
		CanCreateDirectories: true,
		ShowHiddenFiles:      false,
	})
	if err != nil {
		return FileResult{Error: fmt.Sprintf("Fehler beim Öffnen des Dialogs: %v", err)}
	}
	if filename == "" {
		return FileResult{Error: "Fehler: Abgebrochen"}
	}

	data, err := os.ReadFile(filename)
	if err != nil {
		return FileResult{Error: fmt.Sprintf("Fehler beim Lesen: %v", err)}
	}

	return FileResult{
		Content:  string(data),
		Filename: filename,
	}
}

// SaveFile speichert eine Datei – returns error for Wails auto-conversion
func (a *App) SaveFile(content string, filename string) error {
	if filename == "" {
		return fmt.Errorf("Dateiname darf nicht leer sein")
	}

	dir := filepath.Dir(filename)
	_, err := os.Stat(dir)
	if os.IsNotExist(err) {
		return fmt.Errorf("Ordner Schreiben fehlgeschlagen: %w", err)
	}

	// Atomares Schreiben: Erst in eine temporäre Datei schreiben, dann umbenennen.
	// Das verhindert Datenverlust, falls der Schreibvorgang unterbrochen wird
	// (z.B. Stromausfall) — die Originaldatei bleibt intakt.
	tempFile := filename + ".tmp"
	if err := os.WriteFile(tempFile, []byte(content), 0644); err != nil {
		os.Remove(tempFile) // Cleanup failed temp file
		return fmt.Errorf("Schreiben fehlgeschlagen: %w", err)
	}

	if err := os.Rename(tempFile, filename); err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("Umbenennen fehlgeschlagen: %w", err)
	}

	return nil
}

// ReadBinaryFile liest eine Binärdatei und gibt Base64 zurück
func (a *App) ReadBinaryFile(path string) BinaryFileResult {
	content, err := os.ReadFile(path)
	if err != nil {
		return BinaryFileResult{Error: fmt.Sprintf("Fehler beim Lesen: %v", err)}
	}

	mimeType, isImage := detectMimeType(content)
	isPdf := mimeType == "application/pdf"
	base64Data := base64.StdEncoding.EncodeToString(content)

	return BinaryFileResult{
		Data:     base64Data,
		MimeType: mimeType,
		IsImage:  isImage,
		IsPdf:    isPdf,
	}
}

// detectMimeType erkennt den MIME-Typ anhand der "Magic Bytes" am Dateianfang.
// Magic Bytes sind feste Byte-Sequenzen, die Dateiformate identifizieren:
//   PNG: 89 50 4E 47 (‰PNG)
//   JPEG: FF D8 FF
//   PDF: 25 50 44 46 (%PDF)
//   GIF: 47 49 46 38 (GIF8)
// Gibt den MIME-Typ und zurück, ob es ein Bild ist.
func detectMimeType(data []byte) (string, bool) {
	if len(data) < 4 {
		return "application/octet-stream", false
	}

	if data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46 {
		return "application/pdf", false
	}
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg", true
	}
	if len(data) >= 8 && data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 &&
		data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A {
		return "image/png", true
	}
	if len(data) >= 6 && data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x38 &&
		(data[4] == 0x37 || data[4] == 0x39) && data[5] == 0x61 {
		return "image/gif", true
	}
	if len(data) >= 2 && data[0] == 0x42 && data[1] == 0x4D {
		return "image/bmp", true
	}
	if len(data) >= 12 && data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46 &&
		data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50 {
		return "image/webp", true
	}
	if (data[0] == 0x49 && data[1] == 0x49 && data[2] == 0x2A && data[3] == 0x00) ||
		(data[0] == 0x4D && data[1] == 0x4D && data[2] == 0x00 && data[3] == 0x2A) {
		return "image/tiff", true
	}
	if data[0] == 0x00 && data[1] == 0x00 && data[2] == 0x01 && data[3] == 0x00 {
		return "image/x-icon", true
	}
	if len(data) >= 100 {
		header := string(data[:min(200, len(data))])
		if strings.Contains(header, "<svg") || (strings.Contains(header, "<?xml") && strings.Contains(header, "svg")) {
			return "image/svg+xml", true
		}
	}

	return "application/octet-stream", false
}
