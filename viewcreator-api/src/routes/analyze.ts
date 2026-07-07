import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { GoogleGenAI } from "@google/genai";
import { TemplateRepository } from 'viewcreator-database';
import { syncUserMiddleware } from '../middleware/auth-sync.js';
import { fetchS3ImageAsBase64 } from '../services/s3-service.js';

const router = Router();

// ─── Trace helper ───────────────────────────────────────────────────────────
// Stamps every request with a short ID so logs from one request are linkable.
let _traceCounter = 0;
function trace(req: any, ...args: any[]) {
  if (!req._traceId) {
    req._traceId = `r${++_traceCounter}-${Date.now().toString(36)}`;
  }
  console.log(`[ANALYZE:${req._traceId}]`, ...args);
}

/**
 * POST /api/templates/analyze
 *
 * Uses Gemini to analyze a template image and return structured insights:
 * - What industries/use-cases it works well for
 * - What visual elements the AI should preserve
 * - What elements the AI should customize
 *
 * This is a FREE call — no credits are checked or deducted.
 * Results are cached in the template's config JSONB field.
 */
router.post('/api/templates/analyze', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  const { templateId } = req.body;

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  TRACE: REQUEST ENTRY                                       ║
  // ╚══════════════════════════════════════════════════════════════╝
  trace(req, '=== ENTER === POST /api/templates/analyze');
  trace(req, 'body keys:', Object.keys(req.body));
  trace(req, 'templateId:', templateId);
  trace(req, 'auth header present:', !!req.headers.authorization);
  trace(req, 'content-type:', req.headers['content-type']);

  try {
    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 1 — Validate input                                    ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 1 — Validating input...');
    if (!templateId) {
      trace(req, 'STEP 1 ✖ FAILED: templateId missing');
      return res.status(400).json({ error: 'templateId is required' });
    }
    trace(req, 'STEP 1 ✓ OK');

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 2 — Fetch template from DB                           ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 2 — Querying TemplateRepository.findById...');
    const t2Start = Date.now();
    const template = await TemplateRepository.findById(templateId);
    const t2Elapsed = Date.now() - t2Start;
    trace(req, `STEP 2 — DB returned in ${t2Elapsed}ms`);

    if (!template) {
      trace(req, `STEP 2 ✖ Template ${templateId} not found in DB`);
      return res.status(404).json({ error: 'Template not found' });
    }
    trace(req, 'STEP 2 ✓ Template:', {
      id: template.id,
      title: template.title,
      media_type: template.media_type,
      s3_link_truncated: (template.s3_link || '').substring(0, 80),
      config_keys: template.config ? Object.keys(template.config) : [],
      has_aiAnalysis: !!template.config?.aiAnalysis,
    });

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 3 — Cache check                                      ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 3 — Checking for cached aiAnalysis...');
    if (template.config?.aiAnalysis) {
      trace(req, 'STEP 3 ✓ CACHE HIT — returning stored analysis');
      trace(req, 'cached analysis:', JSON.stringify(template.config.aiAnalysis).substring(0, 300));
      trace(req, '=== EXIT (cached) ===');
      return res.json({ analysis: template.config.aiAnalysis, cached: true });
    }
    trace(req, 'STEP 3 — CACHE MISS — proceeding to Gemini');

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 4 — Fetch image from S3                              ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 4 — Fetching template image from S3...');
    trace(req, 'STEP 4 — URL:', template.s3_link);
    let imageData: { mimeType: string; data: string };
    try {
      const t4Start = Date.now();
      imageData = await fetchS3ImageAsBase64(template.s3_link);
      const t4Elapsed = Date.now() - t4Start;
      trace(req, `STEP 4 ✓ S3 fetched in ${t4Elapsed}ms`);
      trace(req, 'STEP 4 — mimeType:', imageData.mimeType);
      trace(req, 'STEP 4 — base64 length:', imageData.data.length, 'bytes');
      trace(req, 'STEP 4 — base64 preview (first 60 chars):', imageData.data.substring(0, 60) + '...');
    } catch (err: any) {
      trace(req, `STEP 4 ✖ S3 fetch FAILED: ${err.message}`);
      trace(req, 'STEP 4 — error stack:', err.stack || 'no stack');
      return res.status(502).json({ error: `Failed to load template image: ${err.message}` });
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 5 — API key check                                    ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 5 — Checking GEMINI_NANO_BANANA_API_KEY...');
    const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
    trace(req, `STEP 5 — key exists: ${!!apiKey}, length: ${(apiKey || '').length}`);
    if (!apiKey || apiKey === 'your_api_key_here') {
      trace(req, 'STEP 5 ✖ API key missing or placeholder');
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }
    trace(req, 'STEP 5 ✓ API key present');

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 6 — Init Gemini client                               ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 6 — Initializing GoogleGenAI...');
    const ai = new GoogleGenAI({ apiKey });
    trace(req, 'STEP 6 ✓ GoogleGenAI initialized');

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 7 — Build prompt                                     ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 7 — Building analysis prompt...');
    const analysisPrompt = `You are a visual design analyst for ViewCreator, an AI-powered marketing content platform. Your job is to analyze marketing template designs and determine how our AI should adapt them for different brands.

Analyze this template image and return a JSON object with these exact fields:

1. "worksWellFor" — Array of 4-8 industry or use-case categories this template's style is best suited for.
   Pick the MOST relevant from this list (or add others if none fit):
   Restaurants, Product launches, Seasonal offers, Ecommerce, Promotions,
   Social media, Real estate, Events, Fashion, Technology, Healthcare,
   Education, Fitness, Travel, Finance, Non-profit, Entertainment,
   Food & beverage, Personal branding, Corporate communications, Beauty,
   Wellness, Automotive, Music, Gaming, Legal services

2. "preserves" — Array of 3-5 visual elements the AI MUST preserve when adapting this template to a brand.
   Choose elements that are central to this template's effectiveness:
   Layout composition, Typography style, Overall aesthetic, Color harmony,
   Visual hierarchy, Photography style, Iconography, Spacing & rhythm,
   Mood & tone, Brand identity feel, Framing & cropping, Texture & depth,
   Lighting style, Graphic elements, Negative space usage

3. "customizes" — Array of 3-5 elements the AI should customize for the user's brand.
   Choose what makes sense for this specific template:
   Product / content, Text & copy, Colors & branding, Logo placement,
   Call-to-action, Images & photography, Background, Headline style,
   Offer details, Social proof elements, Avatar / profile photo,
   Tagline positioning, Price display, Date & location, Button styling,
   Illustration style, Data visualization

4. "title" — A concise, descriptive title for what the user is creating from.
   Format: "You're creating from: [template title]" — just the descriptive part after the colon.
   Example: "A minimalist product showcase for premium brands"

5. "description" — One short sentence describing what makes this template effective and who it's best for.

CRITICAL RULES:
- Return ONLY valid JSON — no markdown, no code blocks, no backticks, no extra text.
- Do not wrap the JSON in \`\`\`json or any other formatting.
- The response must be parseable by JSON.parse() directly.
- Be specific and insightful — don't return generic lists. Tailor the analysis to what you actually see in the image.`;

    trace(req, `STEP 7 ✓ Prompt built (${analysisPrompt.length} chars)`);
    trace(req, 'STEP 7 — prompt preview (first 400 chars):', analysisPrompt.substring(0, 400));

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 8 — Call Gemini                                       ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 8 — Calling ai.models.generateContent...');
    trace(req, 'STEP 8 — model: gemini-3.5-flash');
    trace(req, 'STEP 8 — image part mimeType:', imageData.mimeType);
    trace(req, 'STEP 8 — image part base64 length:', imageData.data.length);
    trace(req, 'STEP 8 — temperature: 0.3, topP: 0.9, maxOutputTokens: 8192, thinkingConfig: { includeThoughts: false }');

    const t8Start = Date.now();
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { role: "user", parts: [{ text: analysisPrompt }] },
          { role: "user", parts: [{ inlineData: { mimeType: imageData.mimeType, data: imageData.data } }] },
        ],
        config: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 8192,
          thinkingConfig: {
            includeThoughts: false,
          },
        } as any,
      });
    } catch (geminiErr: any) {
      const t8Elapsed = Date.now() - t8Start;
      trace(req, `STEP 8 ✖ Gemini threw after ${t8Elapsed}ms`);
      trace(req, `STEP 8 — error name: ${geminiErr.name || geminiErr.constructor?.name}`);
      trace(req, `STEP 8 — error status: ${geminiErr.status}`);
      trace(req, `STEP 8 — error message: ${geminiErr.message}`);
      trace(req, `STEP 8 — error stack: ${geminiErr.stack || 'no stack'}`);
      trace(req, `STEP 8 — full error dump:`, JSON.stringify(geminiErr, Object.getOwnPropertyNames(geminiErr)));
      throw geminiErr;
    }

    const t8Elapsed = Date.now() - t8Start;
    trace(req, `STEP 8 ✓ Gemini returned in ${t8Elapsed}ms`);

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 9 — Extract text from response                       ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 9 — Inspecting Gemini response structure...');
    trace(req, 'STEP 9 — response top-level keys:', Object.keys(response || {}));
    trace(req, `STEP 9 — candidates count: ${response?.candidates?.length ?? 0}`);

    if (response?.candidates?.[0]) {
      trace(req, 'STEP 9 — candidate[0] keys:', Object.keys(response.candidates[0]));
      if (response.candidates[0].content) {
        trace(req, 'STEP 9 — content keys:', Object.keys(response.candidates[0].content));
        trace(req, `STEP 9 — parts count: ${response.candidates[0].content.parts?.length ?? 0}`);
        if (response.candidates[0].content.parts?.[0]) {
          trace(req, 'STEP 9 — part[0] keys:', Object.keys(response.candidates[0].content.parts[0]));
          trace(req, `STEP 9 — part[0] has text: ${!!response.candidates[0].content.parts[0].text}`);
          trace(req, `STEP 9 — part[0] has inlineData: ${!!response.candidates[0].content.parts[0].inlineData}`);
        }
      }
      if (response.candidates[0].finishReason) {
        trace(req, `STEP 9 — finishReason: ${response.candidates[0].finishReason}`);
      }
      if (response.candidates[0].safetyRatings) {
        trace(req, 'STEP 9 — safetyRatings:', JSON.stringify(response.candidates[0].safetyRatings));
      }
    }

    if (response?.usageMetadata) {
      trace(req, 'STEP 9 — usageMetadata:', JSON.stringify(response.usageMetadata));
    }

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    trace(req, `STEP 9 — text extracted: ${!!text}`);
    if (text) {
      trace(req, `STEP 9 — text length: ${text.length} chars`);
      trace(req, 'STEP 9 — text preview (first 600 chars):', text.substring(0, 600));
      trace(req, 'STEP 9 — last 100 chars:', text.substring(text.length - 100));
    }

    if (!text) {
      trace(req, 'STEP 9 ✖ Gemini returned empty text');
      trace(req, 'STEP 9 — full candidate dump:', JSON.stringify(response?.candidates?.[0]).substring(0, 1000));
      return res.status(500).json({
        error: 'Gemini returned an empty response',
        finishReason: response?.candidates?.[0]?.finishReason || 'unknown',
      });
    }
    trace(req, 'STEP 9 ✓ Text extracted');

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 10 — Parse JSON                                      ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 10 — Parsing JSON...');
    let analysis: Record<string, any>;
    try {
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      trace(req, 'STEP 10 — cleaned (first 600 chars):', cleaned.substring(0, 600));
      analysis = JSON.parse(cleaned);
      trace(req, 'STEP 10 ✓ JSON parsed — keys:', Object.keys(analysis));
    } catch (parseErr: any) {
      trace(req, `STEP 10 ✖ JSON parse FAILED: ${parseErr.message}`);
      trace(req, 'STEP 10 — RAW text from Gemini:', text);
      trace(req, 'STEP 10 — cleaned version:', text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim());
      return res.status(500).json({
        error: `Failed to parse AI analysis: ${parseErr.message}`,
        raw_preview: text.substring(0, 800),
      });
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 11 — Validate + normalize                            ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 11 — Validating parsed fields...');
    trace(req, 'STEP 11 — raw worksWellFor:', JSON.stringify(analysis.worksWellFor));
    trace(req, 'STEP 11 — raw preserves:', JSON.stringify(analysis.preserves));
    trace(req, 'STEP 11 — raw customizes:', JSON.stringify(analysis.customizes));
    trace(req, `STEP 11 — raw title: "${analysis.title}"`);
    trace(req, `STEP 11 — raw description: "${analysis.description}"`);

    const validated = {
      worksWellFor: Array.isArray(analysis.worksWellFor) ? analysis.worksWellFor.slice(0, 10) : [],
      preserves: Array.isArray(analysis.preserves) ? analysis.preserves.slice(0, 6) : [],
      customizes: Array.isArray(analysis.customizes) ? analysis.customizes.slice(0, 6) : [],
      title: typeof analysis.title === 'string' ? analysis.title : template.title,
      description: typeof analysis.description === 'string' ? analysis.description : '',
    };

    trace(req, 'STEP 11 ✓ Validated result:', JSON.stringify(validated));

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  STEP 12 — Cache to DB                                     ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, 'STEP 12 — Caching analysis to template config...');
    try {
      const t12Start = Date.now();
      await TemplateRepository.update(templateId, {
        config: {
          ...(template.config || {}),
          aiAnalysis: validated,
        },
      });
      const t12Elapsed = Date.now() - t12Start;
      trace(req, `STEP 12 ✓ Cached in ${t12Elapsed}ms`);
    } catch (cacheErr: any) {
      trace(req, `STEP 12 ⚠ Cache write failed (non-blocking): ${cacheErr.message}`);
      trace(req, 'STEP 12 — cache error stack:', cacheErr.stack || 'no stack');
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  EXIT                                                      ║
    // ╚══════════════════════════════════════════════════════════════╝
    trace(req, '=== EXIT (success) ===');
    return res.json({ analysis: validated, cached: false });
  } catch (error: any) {
    trace(req, '✖ FATAL unhandled error');
    trace(req, `error name: ${error.name || error.constructor?.name}`);
    trace(req, `error message: ${error.message}`);
    trace(req, `error stack: ${error.stack || 'no stack'}`);
    try {
      trace(req, 'full dump:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (_) {
      trace(req, 'could not serialize error');
    }
    return res.status(500).json({
      error: error.message || 'Internal server error during template analysis',
      trace: (req as any)._traceId,
    });
  }
});

export default router;
