// api.go — Externe API-Kommunikation.
// Enthält den HTTP-Proxy für URL-Abruf und die OpenRouter-KI-Integration.
// OpenRouter ist eine API-Plattform, die verschiedene KI-Modelle
// (GPT, Claude, etc.) über eine einheitliche Schnittstelle bereitstellt.
package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ProxyURL lädt eine URL und gibt den HTML-Inhalt zurück.
// Wird für das Einbetten von Webseiten im Editor verwendet.
func (a *App) ProxyURL(targetURL string) (string, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(targetURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP request failed with status: %s", resp.Status)
	}

	contentType := resp.Header.Get("Content-Type")
	if !strings.Contains(contentType, "text/html") {
		return "", fmt.Errorf("expected HTML response but got: %s", contentType)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

// OpenRouterRequest und Message bilden die JSON-Struktur für die
// OpenRouter-API ab (kompatibel mit dem OpenAI-Chat-Format).
type OpenRouterRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// QueryOpenRouter sendet eine Anfrage an die OpenRouter-KI-API und
// streamt die Antwort Token für Token an das Frontend.
// Das Streaming nutzt Server-Sent Events (SSE): Die API sendet
// "data: {...}" Zeilen, die jeweils ein Antwort-Fragment enthalten.
// Jedes Token wird per Wails-Event ("stream_token") an das Frontend
// weitergeleitet, sodass die Antwort live angezeigt wird.
func (a *App) QueryOpenRouter(model, prompt string) error {

	apiKey := a.GetOpenRouterApiKey()
	// API-Key nicht im Klartext loggen (Sicherheit)
	if apiKey != "" {
		log.Printf("API Key configured (length: %d)", len(apiKey))
	}

	if apiKey == "" {
		return fmt.Errorf("kein API-Key konfiguriert. Bitte unter Einstellungen → API Key setzen.")
	}

	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"stream": true,
	}

	log.Printf("🚀 OpenRouter Request: %s", prompt)

	jsonBody, _ := json.Marshal(reqBody)

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	client := &http.Client{
		Timeout: 300 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:          100,
			MaxIdleConnsPerHost:   10,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 60 * time.Second,
		},
	}
	httpReq, _ := http.NewRequestWithContext(ctx, "POST",
		"https://openrouter.ai/api/v1/chat/completions",
		bytes.NewBuffer(jsonBody))

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("HTTP-Referer", "http://localhost")
	httpReq.Header.Set("X-Title", "Leoedit-V2 App")

	resp, err := client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("Request fehlgeschlagen: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API-Fehler (%d): %s", resp.StatusCode, string(body))
	}

	log.Println("📡 Streaming gestartet...")

	// SSE-Streaming: Die Antwort wird zeilenweise gelesen.
	// Jede Zeile beginnt mit "data:" und enthält ein JSON-Fragment
	// mit dem nächsten Token. "data: [DONE]" signalisiert das Ende.
	reader := bufio.NewReader(resp.Body)
	fullResponse := ""
	tokenCount := 0

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				log.Println("✅ Streaming beendet (EOF)")
				break
			}
			return fmt.Errorf("Lesefehler: %w", err)
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if after, ok := strings.CutPrefix(line, "data:"); ok {
			data := strings.TrimSpace(after)

			if data == "[DONE]" {
				log.Printf("✅ Streaming komplett - %d Token empfangen", tokenCount)
				log.Printf("📝 Vollständige Antwort: %s", fullResponse)

				if a.ctx != nil {
					runtime.EventsEmit(a.ctx, "stream_complete", map[string]interface{}{
						"full_response": fullResponse,
						"token_count":   tokenCount,
					})
				}
				break
			}

			var chunk struct {
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
				Error *struct {
					Message string `json:"message"`
				} `json:"error,omitempty"`
			}

			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				log.Printf("⚠️ JSON Parse Fehler: %v - Daten: %s", err, data)
				continue
			}

			if chunk.Error != nil {
				log.Printf("❌ Fehler im Stream: %s", chunk.Error.Message)
				continue
			}

			if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
				token := chunk.Choices[0].Delta.Content
				tokenCount++
				fullResponse += token

				if a.ctx != nil {
					runtime.EventsEmit(a.ctx, "stream_token", map[string]interface{}{
						"token": token,
						"count": tokenCount,
					})
				}
			}
		}
	}

	log.Println("✅ QueryOpenRouter erfolgreich abgeschlossen")
	return nil
}
