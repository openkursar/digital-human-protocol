package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// ReviewResult is the verdict from the AI judge.
type ReviewResult struct {
	Verdict string `json:"verdict"`
	Comment string `json:"comment"`
}

// Judge calls an OpenAI-compatible endpoint.
type Judge struct {
	Endpoint string
	Model    string
	APIKey   string
	client   *http.Client
}

// NewJudge constructs a Judge.
func NewJudge(endpoint, model, apiKey string) *Judge {
	return &Judge{
		Endpoint: endpoint,
		Model:    model,
		APIKey:   apiKey,
		client:   &http.Client{Timeout: 60 * time.Second},
	}
}

// Enabled returns true when an endpoint is configured.
func (j *Judge) Enabled() bool {
	return j.Endpoint != ""
}

// openAIResponse is the standard chat completions response.
type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// Review sends the prompt and parses the JSON response.
// Supports both:
//   1. Direct {verdict, comment} response (legacy wrapper)
//   2. Standard OpenAI chat.completions response
func (j *Judge) Review(systemPrompt, userPrompt string) (*ReviewResult, error) {
	if !j.Enabled() {
		return &ReviewResult{Verdict: "approved", Comment: "AI judge not configured, auto-approved"}, nil
	}

	payload := map[string]interface{}{
		"model": j.Model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", j.Endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if j.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+j.APIKey)
	}

	resp, err := j.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("ai judge returned %d", resp.StatusCode)
	}

	// Try parsing as direct {verdict, comment} first
	var direct map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&direct); err != nil {
		return nil, err
	}

	// If it has a "choices" array, it's standard OpenAI format
	if choices, ok := direct["choices"].([]interface{}); ok && len(choices) > 0 {
		choice, ok := choices[0].(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid OpenAI response format")
		}
		msg, ok := choice["message"].(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid OpenAI response format: no message")
		}
		content, ok := msg["content"].(string)
		if !ok {
			return nil, fmt.Errorf("invalid OpenAI response format: no content")
		}

		// Try to extract JSON from markdown code block: ```json ... ```
		extracted := extractJSONFromMarkdown(content)

		var result ReviewResult
		if err := json.Unmarshal([]byte(extracted), &result); err != nil {
			// If content is not valid JSON, treat the whole content as comment
			return &ReviewResult{Verdict: "approved", Comment: content}, nil
		}
		return &result, nil
	}

	// Legacy direct format: {verdict: "...", comment: "..."}
	verdict := "approved"
	if v, ok := direct["verdict"].(string); ok {
		verdict = v
	}
	comment := ""
	if c, ok := direct["comment"].(string); ok {
		comment = c
	}
	return &ReviewResult{Verdict: verdict, Comment: comment}, nil
}

// extractJSONFromMarkdown tries to extract JSON from markdown code blocks.
// If no code block found, returns the original string.
func extractJSONFromMarkdown(content string) string {
	// Look for ```json ... ``` or ``` ... ```
	start := strings.Index(content, "```json")
	if start == -1 {
		start = strings.Index(content, "```")
	}
	if start == -1 {
		return content
	}
	// Find the end of the opening ```
	codeStart := strings.Index(content[start:], "\n")
	if codeStart == -1 {
		return content
	}
	codeStart += start + 1

	end := strings.Index(content[codeStart:], "```")
	if end == -1 {
		return content
	}
	return strings.TrimSpace(content[codeStart : codeStart+end])
}
