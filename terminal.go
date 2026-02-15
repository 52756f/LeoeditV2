//go:build !windows

// terminal.go - PTY-basierte Terminal-Sitzungen.
// Ermöglicht das Öffnen von Shell-Sessions in Editor-Tabs.
// Jeder Tab hat seine eigene PTY-Session mit unabhängigem Prozess.
package main

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"sync"

	"github.com/creack/pty"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// TerminalSession repräsentiert eine aktive PTY-Sitzung
type TerminalSession struct {
	ID      string
	cmd     *exec.Cmd
	ptyFile *os.File
	mu      sync.Mutex
	running bool
}

// terminalSessions speichert alle aktiven Terminal-Sitzungen (tabId -> session)
var terminalSessions = make(map[string]*TerminalSession)
var terminalMu sync.RWMutex

// getDefaultShell ermittelt die Standard-Shell für das aktuelle Betriebssystem
func getDefaultShell() string {
	switch runtime.GOOS {
	case "windows":
		// PowerShell bevorzugen, sonst cmd
		if _, err := exec.LookPath("powershell.exe"); err == nil {
			return "powershell.exe"
		}
		return "cmd.exe"
	default: // linux, darwin
		if shell := os.Getenv("SHELL"); shell != "" {
			return shell
		}
		if _, err := exec.LookPath("/bin/bash"); err == nil {
			return "/bin/bash"
		}
		return "/bin/sh"
	}
}

// StartTerminal startet eine neue Terminal-Sitzung für den angegebenen Tab
func (a *App) StartTerminal(tabId string) error {
	terminalMu.Lock()
	defer terminalMu.Unlock()

	// Prüfen ob bereits eine Session für diesen Tab existiert
	if _, exists := terminalSessions[tabId]; exists {
		return fmt.Errorf("Terminal-Sitzung für Tab %s existiert bereits", tabId)
	}

	// Shell-Befehl vorbereiten
	shell := getDefaultShell()
	cmd := exec.Command(shell)

	// Umgebungsvariablen setzen
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	// Arbeitsverzeichnis auf Home-Verzeichnis setzen
	if home, err := os.UserHomeDir(); err == nil {
		cmd.Dir = home
	}

	// PTY starten
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return fmt.Errorf("PTY konnte nicht gestartet werden: %w", err)
	}

	// Session speichern
	session := &TerminalSession{
		ID:      tabId,
		cmd:     cmd,
		ptyFile: ptmx,
		running: true,
	}
	terminalSessions[tabId] = session

	// Goroutine zum Lesen der PTY-Ausgabe starten
	go a.streamTerminalOutput(session)

	return nil
}

// streamTerminalOutput liest kontinuierlich von der PTY und sendet Daten ans Frontend
func (a *App) streamTerminalOutput(session *TerminalSession) {
	buf := make([]byte, 4096)
	for {
		n, err := session.ptyFile.Read(buf)
		if err != nil {
			if err == io.EOF {
				break
			}
			// Prüfen ob Session noch läuft (könnte geschlossen worden sein)
			session.mu.Lock()
			running := session.running
			session.mu.Unlock()
			if !running {
				break
			}
			continue
		}
		if n > 0 && a.ctx != nil {
			wailsRuntime.EventsEmit(a.ctx,
				fmt.Sprintf("terminal_output_%s", session.ID),
				string(buf[:n]))
		}
	}

	// Prozess-Exit-Status ermitteln
	exitCode := 0
	if session.cmd.ProcessState != nil {
		exitCode = session.cmd.ProcessState.ExitCode()
	} else {
		// Auf Prozess-Ende warten
		session.cmd.Wait()
		if session.cmd.ProcessState != nil {
			exitCode = session.cmd.ProcessState.ExitCode()
		}
	}

	// Exit-Event senden
	if a.ctx != nil {
		wailsRuntime.EventsEmit(a.ctx,
			fmt.Sprintf("terminal_exit_%s", session.ID),
			map[string]interface{}{"exitCode": exitCode})
	}

	// Session bereinigen
	terminalMu.Lock()
	delete(terminalSessions, session.ID)
	terminalMu.Unlock()
}

// WriteTerminal sendet Eingabedaten an die Terminal-Sitzung
func (a *App) WriteTerminal(tabId string, data string) error {
	terminalMu.RLock()
	session, exists := terminalSessions[tabId]
	terminalMu.RUnlock()

	if !exists {
		return fmt.Errorf("keine Terminal-Sitzung für Tab %s gefunden", tabId)
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	if !session.running {
		return fmt.Errorf("Terminal-Sitzung ist nicht mehr aktiv")
	}

	_, err := session.ptyFile.Write([]byte(data))
	return err
}

// ResizeTerminal ändert die Größe der PTY
func (a *App) ResizeTerminal(tabId string, cols, rows uint16) error {
	terminalMu.RLock()
	session, exists := terminalSessions[tabId]
	terminalMu.RUnlock()

	if !exists {
		return fmt.Errorf("keine Terminal-Sitzung für Tab %s gefunden", tabId)
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	if !session.running {
		return nil // Ignorieren wenn nicht mehr aktiv
	}

	return pty.Setsize(session.ptyFile, &pty.Winsize{
		Rows: rows,
		Cols: cols,
	})
}

// StopTerminal beendet eine Terminal-Sitzung
func (a *App) StopTerminal(tabId string) error {
	terminalMu.Lock()
	session, exists := terminalSessions[tabId]
	if !exists {
		terminalMu.Unlock()
		return nil // Bereits beendet
	}
	delete(terminalSessions, tabId)
	terminalMu.Unlock()

	session.mu.Lock()
	defer session.mu.Unlock()

	session.running = false

	// PTY schließen
	if session.ptyFile != nil {
		session.ptyFile.Close()
	}

	// Prozess beenden falls noch laufend
	if session.cmd != nil && session.cmd.Process != nil {
		session.cmd.Process.Kill()
	}

	return nil
}
