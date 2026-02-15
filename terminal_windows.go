//go:build windows

// terminal_windows.go - Stub für Windows (creack/pty nicht verfügbar).
package main

import "fmt"

var errNotSupported = fmt.Errorf("Terminal wird unter Windows nicht unterstützt")

func (a *App) StartTerminal(tabId string) error            { return errNotSupported }
func (a *App) WriteTerminal(tabId string, data string) error { return errNotSupported }
func (a *App) ResizeTerminal(tabId string, cols, rows uint16) error { return errNotSupported }
func (a *App) StopTerminal(tabId string) error              { return nil }
