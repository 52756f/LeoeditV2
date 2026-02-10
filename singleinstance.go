// singleinstance.go — Single-Instance-Logik über Unix Domain Socket.
// Verhindert, dass mehrere Instanzen von Leoedit gleichzeitig laufen.
// Wenn eine Instanz bereits läuft, werden Dateipfade per IPC weitergeleitet.
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// getSocketPath gibt den Pfad zum Unix Domain Socket zurück.
func getSocketPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	return filepath.Join(configDir, "Leoedit", "leoedit.sock")
}

// tryConnectExisting versucht, eine Verbindung zum Socket einer laufenden Instanz
// herzustellen. Bei Erfolg werden die Dateipfade als JSON gesendet und true zurückgegeben.
// Bei Fehler wird false zurückgegeben (keine laufende Instanz gefunden).
func tryConnectExisting(files []string) bool {
	socketPath := getSocketPath()

	conn, err := net.Dial("unix", socketPath)
	if err != nil {
		// Keine laufende Instanz — stale Socket aufräumen falls vorhanden
		os.Remove(socketPath)
		return false
	}
	defer conn.Close()

	// Dateipfade als JSON senden
	data, err := json.Marshal(files)
	if err != nil {
		return false
	}

	_, err = fmt.Fprintf(conn, "%s\n", data)
	if err != nil {
		return false
	}

	// Auf "OK"-Antwort warten
	scanner := bufio.NewScanner(conn)
	if scanner.Scan() {
		return scanner.Text() == "OK"
	}

	return false
}

// startSocketListener startet den Unix Domain Socket Listener in einer Goroutine.
// Eingehende Verbindungen werden in handleSocketConnection verarbeitet.
func (a *App) startSocketListener() {
	socketPath := getSocketPath()

	// Sicherstellen, dass das Verzeichnis existiert
	os.MkdirAll(filepath.Dir(socketPath), 0755)

	// Alten Socket entfernen (falls von vorherigem Absturz übrig)
	os.Remove(socketPath)

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Could not start socket listener: %v\n", err)
		return
	}

	a.listener = listener

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				// Listener wurde geschlossen (normaler Shutdown)
				return
			}
			go a.handleSocketConnection(conn)
		}
	}()
}

// handleSocketConnection verarbeitet eine eingehende Socket-Verbindung.
// Liest JSON-Dateipfade und öffnet sie in der laufenden Instanz.
func (a *App) handleSocketConnection(conn net.Conn) {
	defer conn.Close()

	scanner := bufio.NewScanner(conn)
	if !scanner.Scan() {
		return
	}

	var paths []string
	if err := json.Unmarshal([]byte(scanner.Text()), &paths); err != nil {
		return
	}

	a.openFilesFromSocket(paths)

	fmt.Fprintln(conn, "OK")
}

// openFilesFromSocket öffnet die empfangenen Dateien im Frontend und bringt
// das Fenster in den Vordergrund.
func (a *App) openFilesFromSocket(paths []string) {
	// Fenster in den Vordergrund bringen.
	// WindowShow allein reicht unter Linux oft nicht, da der Window Manager
	// das Fenster nicht fokussiert. Der AlwaysOnTop-Trick erzwingt das Raise.
	runtime.WindowUnminimise(a.ctx)
	runtime.WindowShow(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, true)
	go func() {
		time.Sleep(200 * time.Millisecond)
		runtime.WindowSetAlwaysOnTop(a.ctx, false)
	}()

	// Dateien über das bestehende "file-drop" Event an das Frontend senden
	for _, path := range paths {
		runtime.EventsEmit(a.ctx, "file-drop", path)
	}
}

// stopSocketListener beendet den Socket-Listener und räumt die Socket-Datei auf.
func (a *App) stopSocketListener() {
	if a.listener != nil {
		a.listener.Close()
		a.listener = nil
	}
	os.Remove(getSocketPath())
}
