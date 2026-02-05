// encryption.go — Verschlüsselung des OpenRouter-API-Keys.
// Der API-Key wird mit AES-256-GCM verschlüsselt in der config.json gespeichert,
// damit er nicht im Klartext auf der Festplatte liegt.
//
// Ablauf:
//   1. Aus einer festen Passphrase wird per SHA-256 ein 256-Bit-Schlüssel abgeleitet
//   2. Beim Speichern: Klartext → AES-GCM-Verschlüsselung → Base64-Kodierung → config.json
//   3. Beim Laden:     config.json → Base64-Dekodierung → AES-GCM-Entschlüsselung → Klartext
//
// GCM (Galois/Counter Mode) bietet sowohl Verschlüsselung als auch
// Integritätsprüfung — manipulierte Daten werden beim Entschlüsseln erkannt.
package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
)

// encryptionKey: 256-Bit AES-Schlüssel, abgeleitet aus maschinenspezifischen Daten.
// SHA-256 erzeugt immer genau 32 Bytes — passend für AES-256.
// Die Verwendung der Machine-ID macht den Schlüssel einzigartig pro Gerät.
var encryptionKey = deriveMachineKey()

// deriveMachineKey erzeugt einen maschinenspezifischen Schlüssel.
// Kombiniert eine feste App-Komponente mit der Machine-ID des Systems.
func deriveMachineKey() [32]byte {
	machineID := getMachineID()
	// Kombiniere App-spezifischen Salt mit Machine-ID
	combined := "Leoedit-V2-" + machineID
	return sha256.Sum256([]byte(combined))
}

// getMachineID liest die maschinenspezifische ID des Systems.
// Fallback auf einen festen Wert, wenn keine ID gefunden wird.
func getMachineID() string {
	// Linux: /etc/machine-id
	if data, err := os.ReadFile("/etc/machine-id"); err == nil {
		return strings.TrimSpace(string(data))
	}
	// Linux Fallback: /var/lib/dbus/machine-id
	if data, err := os.ReadFile("/var/lib/dbus/machine-id"); err == nil {
		return strings.TrimSpace(string(data))
	}
	// macOS: Hardware UUID via ioreg (vereinfacht: Hostname als Fallback)
	if hostname, err := os.Hostname(); err == nil {
		return hostname
	}
	// Letzter Fallback: Benutzerverzeichnis
	if home, err := os.UserHomeDir(); err == nil {
		return sha256String(home)
	}
	return "default-fallback-id"
}

// sha256String gibt den SHA256-Hash eines Strings als Hex-String zurück
func sha256String(s string) string {
	h := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%x", h)
}

// encryptApiKey verschlüsselt den API-Key mit AES-GCM.
// Die Nonce (Zufallswert) wird dem Chiffretext vorangestellt,
// damit sie beim Entschlüsseln wieder extrahiert werden kann.
// Rückgabe: Base64-kodierter String (Nonce + Chiffretext).
func encryptApiKey(plaintext string) (string, error) {
	block, err := aes.NewCipher(encryptionKey[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Nonce: Einmaliger Zufallswert (12 Bytes bei GCM).
	// Verhindert, dass gleicher Klartext gleichen Chiffretext ergibt.
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Seal: Verschlüsselt und hängt Auth-Tag an.
	// Das erste Argument (nonce) wird als Präfix vorangestellt.
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decryptApiKey entschlüsselt den API-Key.
// Erwartet Base64-kodierten String mit vorangestellter Nonce.
func decryptApiKey(encrypted string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(encryptionKey[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	if len(ciphertext) < gcm.NonceSize() {
		return "", fmt.Errorf("ciphertext too short")
	}

	// Nonce und eigentlichen Chiffretext trennen
	nonce, ciphertext := ciphertext[:gcm.NonceSize()], ciphertext[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// SetOpenRouterApiKey encrypts and saves the API key
func (a *App) SetOpenRouterApiKey(apiKey string) error {
	encrypted, err := encryptApiKey(apiKey)
	if err != nil {
		return fmt.Errorf("encryption failed: %v", err)
	}
	a.Config.OpenRouterApiKey = encrypted
	return a.saveConfig()
}

// GetOpenRouterApiKey retrieves and decrypts the stored API key
func (a *App) GetOpenRouterApiKey() string {
	if a.Config.OpenRouterApiKey == "" {
		return ""
	}
	decrypted, err := decryptApiKey(a.Config.OpenRouterApiKey)
	if err != nil {
		log.Printf("Failed to decrypt API key: %v", err)
		return ""
	}
	return decrypted
}

// HasOpenRouterApiKey checks if an API key is configured
func (a *App) HasOpenRouterApiKey() bool {
	if os.Getenv("OPENROUTER_API_KEY") != "" {
		return true
	}
	return a.Config.OpenRouterApiKey != ""
}
