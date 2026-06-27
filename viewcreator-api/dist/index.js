"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const genai_1 = require("@google/genai");
const viewcreator_database_1 = require("viewcreator-database");
const express_2 = require("@clerk/express");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middlewares
// Use a large payload limit (e.g., 10mb) to support base64 encoded reference images
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, cors_1.default)());
app.use((0, express_2.clerkMiddleware)());
/**
 * Ensures the authenticated user exists in the database.
 * If not, fetches details from Clerk and creates a new database record.
 */
async function ensureUserSynced(userId) {
    try {
        console.log(`[Auth Sync] Checking if user ${userId} exists in database...`);
        const dbUser = await viewcreator_database_1.UserRepository.findById(userId);
        if (!dbUser) {
            console.log(`[Auth Sync] User ${userId} not found in database. Fetching from Clerk...`);
            const clerkUser = await express_2.clerkClient.users.getUser(userId);
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            if (!email) {
                throw new Error(`User ${userId} does not have a primary email address in Clerk.`);
            }
            const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined;
            console.log(`[Auth Sync] Registering user in database: ${email} | Name: ${name}`);
            await viewcreator_database_1.UserRepository.create({
                id: userId,
                email,
                name,
            });
            console.log(`[Auth Sync] Successfully created user row for ${userId}`);
        }
        else {
            console.log(`[Auth Sync] User ${userId} already exists in database.`);
        }
    }
    catch (error) {
        console.error(`[Auth Sync] Failed to sync user ${userId}:`, error);
    }
}
const syncUserMiddleware = async (req, res, next) => {
    const userId = req.auth?.userId;
    if (userId) {
        await ensureUserSynced(userId);
    }
    next();
};
/**
 * Downloads a public S3 template image and converts it to base64 format for Gemini
 */
async function fetchS3ImageAsBase64(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch template image from S3: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/webp';
    const data = buffer.toString('base64');
    return { mimeType, data };
}
// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Get All Templates Endpoint
app.get('/api/templates', (0, express_2.requireAuth)(), syncUserMiddleware, async (req, res) => {
    try {
        const templates = await viewcreator_database_1.TemplateRepository.findAll();
        res.json({ templates });
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to retrieve templates from database' });
    }
});
// Image Generation Endpoint
app.post('/api/generate', (0, express_2.requireAuth)(), syncUserMiddleware, async (req, res) => {
    try {
        const { prompt, aspectRatio = '1:1', imageSize = '1K', numberOfImages = 1, style = 'None', quality = 'Standard', thinkingLevel = 'minimal', referenceImages = [], personGeneration = 'DONT_ALLOW', templateId } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            return res.status(500).json({
                error: 'API key is not configured on the server. Please check the GEMINI_NANO_BANANA_API_KEY setting.'
            });
        }
        const ai = new genai_1.GoogleGenAI({ apiKey });
        // Construct the locked prompt based on style and quality
        let finalPrompt = prompt;
        if (style !== 'None') {
            finalPrompt += `\n\nStyle: ${style}.`;
        }
        if (quality === 'Premium') {
            finalPrompt += `\n\nQuality: Ultra high quality, 4k resolution, photorealistic, highly detailed, masterpiece, professional marketing asset.`;
        }
        // Build the contents array
        const contents = [finalPrompt];
        // If templateId is provided, retrieve the viral template from PostgreSQL and fetch its S3 image
        if (templateId) {
            try {
                console.log(`[Generate API] Retrieving template ${templateId} from database...`);
                const template = await viewcreator_database_1.TemplateRepository.findById(templateId);
                if (template) {
                    console.log(`[Generate API] Fetching public S3 image from: ${template.s3_link}`);
                    const { mimeType, data } = await fetchS3ImageAsBase64(template.s3_link);
                    contents.push({
                        inlineData: {
                            mimeType,
                            data
                        }
                    });
                    console.log(`[Generate API] Successfully loaded template image as reference.`);
                }
                else {
                    console.warn(`[Generate API] Template with ID ${templateId} not found.`);
                }
            }
            catch (err) {
                console.error('[Generate API] Error processing template image:', err);
                return res.status(400).json({ error: `Failed to load template image: ${err.message}` });
            }
        }
        // Process reference images (support up to 3 for composition control)
        if (Array.isArray(referenceImages) && referenceImages.length > 0) {
            for (const refImage of referenceImages.slice(0, 3)) {
                if (refImage && typeof refImage === 'string') {
                    const match = refImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
                    if (match) {
                        contents.push({
                            inlineData: {
                                mimeType: match[1],
                                data: match[2]
                            }
                        });
                    }
                }
            }
        }
        const count = Math.min(Math.max(1, numberOfImages), 4); // Limit between 1 and 4
        // Validate image size
        const validSizes = ['512', '1K', '2K', '4K'];
        const finalImageSize = validSizes.includes(imageSize) ? imageSize : '1K';
        // Build the image configuration
        const imageConfig = {
            aspectRatio: aspectRatio
        };
        // Add imageSize if not 1K (default)
        if (finalImageSize !== '1K') {
            imageConfig.imageSize = finalImageSize;
        }
        console.log("[Generate API] Request parameters:");
        console.log("- Prompt length:", finalPrompt.length);
        console.log("- Aspect Ratio:", aspectRatio);
        console.log("- Image Size:", finalImageSize);
        console.log("- Count:", count);
        console.log("- Thinking Level:", thinkingLevel);
        console.log("- References count:", referenceImages.length);
        console.log("- Full imageConfig object:", JSON.stringify(imageConfig));
        // We make parallel requests to ensure we get exactly the requested number of images
        const promises = Array.from({ length: count }).map((_, index) => {
            console.log(`[Generate API] Starting generation for image ${index + 1}/${count}`);
            return ai.models.generateContent({
                model: "gemini-3.1-flash-image",
                contents,
                config: {
                    responseModalities: ["IMAGE"],
                    personGeneration: personGeneration || 'DONT_ALLOW',
                    imageConfig: imageConfig,
                    thinkingConfig: {
                        thinkingLevel: ['high', 'minimal'].includes(thinkingLevel) ? thinkingLevel : 'minimal',
                        includeThoughts: false
                    }
                }
            }).then(response => {
                console.log(`[Generate API] Successfully completed image ${index + 1}/${count}`);
                return response;
            }).catch(e => {
                console.error(`[Generate API] Single image generation failed for image ${index + 1}:`, e);
                return null;
            });
        });
        const responses = await Promise.all(promises);
        const imageUrls = [];
        for (const response of responses) {
            if (!response)
                continue;
            if (response.candidates && response.candidates[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const mimeType = part.inlineData.mimeType || 'image/jpeg';
                        imageUrls.push(`data:${mimeType};base64,${part.inlineData.data}`);
                        break; // Just one image per response
                    }
                }
            }
        }
        if (imageUrls.length === 0) {
            throw new Error('API did not return any images.');
        }
        return res.json({ imageUrls });
    }
    catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
// Start Server
app.listen(port, () => {
    console.log(`🚀 ViewCreator API is running on http://localhost:${port}`);
    console.log(`📍 Health check: http://localhost:${port}/health`);
    console.log(`📍 Generate endpoint: http://localhost:${port}/api/generate`);
});
