// mcp-nanobanana: MCP server for Gemini image generation (Nano Banana models)
//
// BUG FIX: The previous binary only returned text/thinking parts, dropping
// InlineData / ImageBytes from the Gemini GenerateImages response entirely.
// This version correctly reads Image.ImageBytes, base64-encodes it, and
// returns it as an mcp.ImageContent block so clients see the actual image.
package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"google.golang.org/genai"
)

// modelAliases maps friendly names to their stable GA model IDs.
// Confirmed available in casey-genmedia / us-central1 as of 2026-06:
//   ✅ gemini-2.5-flash-image  — GenerateContent + IMAGE modality
//   ✅ imagen-3.0-generate-002 — GenerateImages API
//   ❌ gemini-3.1-flash-image  — not yet available in this project (404)
//   ❌ gemini-3-pro-image      — not yet available in this project (404)
var modelAliases = map[string]string{
	// gemini-2.5-flash-image / Nano Banana (✅ available)
	"nano-banana":            "gemini-2.5-flash-image",
	"nano banana":            "gemini-2.5-flash-image",
	"nano_banana":            "gemini-2.5-flash-image",
	"gemini-2.5-flash-image": "gemini-2.5-flash-image",
	// gemini-3-pro-image / Nano Banana Pro (❌ not yet available — passes through as-is)
	"nano-banana-pro":    "gemini-3-pro-image",
	"nano banana pro":    "gemini-3-pro-image",
	"gemini-3-pro-image": "gemini-3-pro-image",
	"gemini 3 pro image": "gemini-3-pro-image",
	// gemini-3.1-flash-image / Nano Banana 2 (❌ not yet available — passes through as-is)
	"nano-banana-2":          "gemini-3.1-flash-image",
	"nano banana 2":          "gemini-3.1-flash-image",
	"gemini-3.1-flash-image": "gemini-3.1-flash-image",
}

func resolveModel(name string) string {
	lower := strings.ToLower(strings.TrimSpace(name))
	if resolved, ok := modelAliases[lower]; ok {
		return resolved
	}
	return name // pass through — caller may supply a full model ID
}

func main() {
	project := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if project == "" {
		project = "casey-genmedia"
	}
	location := os.Getenv("GOOGLE_CLOUD_LOCATION")
	if location == "" {
		location = "us-central1"
	}
	transport := strings.ToLower(os.Getenv("TRANSPORT"))

	// ── MCP Server setup ────────────────────────────────────────────────────
	s := server.NewMCPServer(
		"mcp-nanobanana",
		"1.1.0", // bumped version to distinguish fixed binary
		server.WithToolCapabilities(true),
	)

	// ── Tool definition ─────────────────────────────────────────────────────
	tool := mcp.NewTool(
		"nanobanana_image_generation",
		mcp.WithDescription("Generates content (text and/or images) based on a multimodal prompt using Gemini Image generation models."),
		mcp.WithString("prompt",
			mcp.Required(),
			mcp.Description("The text prompt for content generation."),
		),
		mcp.WithString("model",
			mcp.Description(`Model for image generation. Can be a full model ID or a common name. Supported models:
- *gemini-2.5-flash-image* (Ratios: 1:1, 3:4, 4:3, 9:16, 16:9) Aliases: *Nano Banana*, *nano-banana* - Gemini 2.5 Flash Image, or Nano Banana, is optimized for image understanding and generation and offers a balance of price and performance.
- *gemini-3-pro-image* (Ratios: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9) Aliases: *Nano Banana Pro*, *Gemini 3 Pro Image* - Gemini 3 Pro Image, or Gemini 3 Pro (with Nano Banana), is designed to tackle the most challenging image generation by incorporating state-of-the-art reasoning capabilities. It's the best model for complex and multi-turn image generation and editing, having improved accuracy and enhanced image quality.
- *gemini-3.1-flash-image* (Ratios: 1:1, 3:2, 2:3, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9) Aliases: *Nano Banana 2* - Gemini 3.1 Flash Image, or Nano Banana 2.
`),
			mcp.DefaultString("gemini-2.5-flash-image"),
		),
		mcp.WithString("aspect_ratio",
			mcp.Description("Aspect ratio of the generated images. Note: supported aspect ratios are model-dependent."),
			mcp.DefaultString("1:1"),
		),
	)

	// ── Tool handler ────────────────────────────────────────────────────────
	s.AddTool(tool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		prompt, err := req.RequireString("prompt")
		if err != nil {
			return mcp.NewToolResultError("missing required param: prompt"), nil
		}
		modelName := req.GetString("model", "gemini-2.5-flash-image")
		aspectRatio := req.GetString("aspect_ratio", "1:1")
		modelID := resolveModel(modelName)

		log.Printf("nanobanana_image_generation: model=%s (→%s) aspect=%s prompt=%.80s",
			modelName, modelID, aspectRatio, prompt)

		// Create Gemini client
		client, err := genai.NewClient(ctx, &genai.ClientConfig{
			Project:  project,
			Location: location,
			Backend:  genai.BackendVertexAI,
		})
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to create Gemini client: %v", err)), nil
		}

		var contents []mcp.Content

		if strings.HasPrefix(modelID, "gemini-") {
			// ── Gemini image models: use GenerateContent with IMAGE modality ──
			//
			// Gemini image models (gemini-2.5-flash-image, gemini-3-pro-image,
			// gemini-3.1-flash-image) use the standard GenerateContent API with
			// ResponseModalities including "IMAGE". Image bytes come back as
			// Part.InlineData.Data, not via GenerateImages().
			config := &genai.GenerateContentConfig{
				ResponseModalities: []string{"IMAGE", "TEXT"},
			}
			resp, err := client.Models.GenerateContent(ctx, modelID, genai.Text(prompt), config)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("error calling Gemini API: %v", err)), nil
			}
			if resp == nil || len(resp.Candidates) == 0 {
				return mcp.NewToolResultError("Gemini returned no candidates"), nil
			}
			for _, cand := range resp.Candidates {
				if cand.Content == nil {
					continue
				}
				for _, part := range cand.Content.Parts {
					if part.InlineData != nil && len(part.InlineData.Data) > 0 {
						mimeType := part.InlineData.MIMEType
						if mimeType == "" {
							mimeType = "image/png"
						}
						encoded := base64.StdEncoding.EncodeToString(part.InlineData.Data)
						contents = append(contents, mcp.ImageContent{
							Type:     "image",
							Data:     encoded,
							MIMEType: mimeType,
						})
					} else if part.Text != "" {
						contents = append(contents, mcp.TextContent{
							Type: "text",
							Text: part.Text,
						})
					}
				}
			}
		} else {
			// ── Imagen models: use GenerateImages ─────────────────────────────
			//
			// Imagen models (imagen-3.0-generate-002, etc.) use the dedicated
			// GenerateImages API. Image bytes come back as GeneratedImage.Image.ImageBytes.
			resp, err := client.Models.GenerateImages(ctx, modelID, prompt, &genai.GenerateImagesConfig{
				AspectRatio:    aspectRatio,
				NumberOfImages: 1,
			})
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("error calling Gemini API: %v", err)), nil
			}
			if resp == nil || len(resp.GeneratedImages) == 0 {
				return mcp.NewToolResultError("Gemini returned no images (may have been filtered by safety policy)"), nil
			}

			for _, genImg := range resp.GeneratedImages {
				if genImg == nil {
					continue
				}
				if genImg.RAIFilteredReason != "" {
					contents = append(contents, mcp.TextContent{
						Type: "text",
						Text: fmt.Sprintf("Image filtered by safety policy: %s", genImg.RAIFilteredReason),
					})
					continue
				}
				if genImg.Image == nil || len(genImg.Image.ImageBytes) == 0 {
					log.Printf("warning: GeneratedImage has nil Image or empty ImageBytes")
					continue
				}
				mimeType := genImg.Image.MIMEType
				if mimeType == "" {
					mimeType = "image/png"
				}
				encoded := base64.StdEncoding.EncodeToString(genImg.Image.ImageBytes)
				contents = append(contents, mcp.ImageContent{
					Type:     "image",
					Data:     encoded,
					MIMEType: mimeType,
				})
				if genImg.EnhancedPrompt != "" && genImg.EnhancedPrompt != prompt {
					contents = append(contents, mcp.TextContent{
						Type: "text",
						Text: fmt.Sprintf("Enhanced prompt: %s", genImg.EnhancedPrompt),
					})
				}
			}
		}

		if len(contents) == 0 {
			return mcp.NewToolResultError("no images returned — all may have been filtered by safety policy"), nil
		}

		return &mcp.CallToolResult{Content: contents}, nil
	})

	// ── Start transport ─────────────────────────────────────────────────────
	if transport == "http" {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		log.Printf("mcp-nanobanana v1.1.0 (fixed): HTTP transport on :%s (project=%s location=%s)",
			port, project, location)
		httpServer := server.NewStreamableHTTPServer(s)
		if err := httpServer.Start(":" + port); err != nil {
			log.Fatalf("HTTP server error: %v", err)
		}
	} else {
		log.Printf("mcp-nanobanana v1.1.0 (fixed): stdio transport (project=%s location=%s)",
			project, location)
		if err := server.ServeStdio(s); err != nil {
			log.Fatalf("stdio error: %v", err)
		}
	}
}
