import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { GoogleGenAI } from "@google/genai";
import { TemplateRepository } from 'viewcreator-database';
import { syncUserMiddleware } from '../middleware/auth-sync.js';
import { fetchS3ImageAsBase64 } from '../services/s3-service.js';

const router = Router();

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
  try {
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }

    // ── Fetch template from DB ─────────────────────────────────
    const template = await TemplateRepository.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // ── Check if analysis already exists in config (cache hit) ──
    if (template.config?.aiAnalysis) {
      console.log(`[Analyze API] Cache hit for template ${templateId}`);
      return res.json({ analysis: template.config.aiAnalysis, cached: true });
    }

    // ── Fetch template image from S3 ────────────────────────────
    console.log(`[Analyze API] Fetching template image from S3: ${template.s3_link}`);
    let imageData: { mimeType: string; data: string };
    try {
      imageData = await fetchS3ImageAsBase64(template.s3_link);
    } catch (err: any) {
      return res.status(502).json({ error: `Failed to load template image: ${err.message}` });
    }

    // ── Gemini Analysis ─────────────────────────────────────────
    const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(500).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

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

    console.log(`[Analyze API] Calling Gemini for template ${templateId}...`);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash",
      contents: [
        { role: "user", parts: [{ text: analysisPrompt }] },
        { role: "user", parts: [{ inlineData: { mimeType: imageData.mimeType, data: imageData.data } }] },
      ],
      config: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 1024,
      } as any,
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: 'Gemini returned an empty response' });
    }

    // ── Parse the JSON response ─────────────────────────────────
    let analysis: Record<string, any>;
    try {
      // Strip any markdown code fences the model might output despite instructions
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr: any) {
      console.error('[Analyze API] Failed to parse Gemini response:', text);
      return res.status(500).json({ error: `Failed to parse AI analysis: ${parseErr.message}` });
    }

    // Ensure the required fields exist with sensible defaults
    const validated = {
      worksWellFor: Array.isArray(analysis.worksWellFor) ? analysis.worksWellFor.slice(0, 10) : [],
      preserves: Array.isArray(analysis.preserves) ? analysis.preserves.slice(0, 6) : [],
      customizes: Array.isArray(analysis.customizes) ? analysis.customizes.slice(0, 6) : [],
      title: typeof analysis.title === 'string' ? analysis.title : template.title,
      description: typeof analysis.description === 'string' ? analysis.description : '',
    };

    // ── Cache result in template config ─────────────────────────
    try {
      await TemplateRepository.update(templateId, {
        config: {
          ...(template.config || {}),
          aiAnalysis: validated,
        },
      });
      console.log(`[Analyze API] ✅ Analysis cached in template ${templateId}`);
    } catch (cacheErr: any) {
      // Non-blocking — analysis still works, just won't be cached
      console.warn(`[Analyze API] ⚠️ Failed to cache analysis: ${cacheErr.message}`);
    }

    return res.json({ analysis: validated, cached: false });
  } catch (error: any) {
    console.error('[Analyze API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during template analysis' });
  }
});

export default router;
