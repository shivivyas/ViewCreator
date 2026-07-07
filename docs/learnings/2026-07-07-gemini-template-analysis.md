## 2026-07-07: Gemini model selection & thinking token handling for vision analysis

### What Happened
Building a template image analysis feature required calling Gemini for image→text analysis. Three model names failed before finding the right one, and the successful model truncated its output due to thinking token consumption.

### Root Cause
1. Multiple model names returned 404 (not in v1beta API or deprecated): `gemini-3.1-flash`, `gemini-2.0-flash`, `gemini-2.5-flash`
2. `gemini-3.5-flash` uses ~984 tokens for internal "thoughts" by default, eating into the output budget and truncating responses

### Lesson
- **Discover models first**: Use `GET https://generativelanguage.googleapis.com/v1beta/models?key=<API_KEY>` to list available models with their supported methods — don't guess model names
- **Disable thinking for structured output tasks**: Set `thinkingConfig: { includeThoughts: false }` to prevent the model from burning output tokens on reasoning. Also bump `maxOutputTokens` to 8192 for headroom
- **For image→text analysis** (not image generation), use a multimodal text model like `gemini-3.5-flash`, not an image-generation model like `gemini-3.1-flash-image`
- **No credit cost for analysis**: Analysis calls are separate from generation — no credit check or deduction needed. Use a separate endpoint that doesn't import credit services

### Applied To
`viewcreator-api/src/routes/analyze.ts` — the endpoint itself encodes all these lessons

### Trigger
404 errors on model name guesses, then `MAX_TOKENS` finish reason with only 19 chars of output (the response was `{\n  "worksWellFor":` before being cut off)
