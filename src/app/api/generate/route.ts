import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      aspectRatio = '1:1',
      imageSize = '1K',
      numberOfImages = 1,
      style = 'None',
      quality = 'Standard',
      thinkingLevel = 'minimal',
      referenceImages = [],
      personGeneration = 'DONT_ALLOW'
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;

    if (!apiKey || apiKey === 'your_api_key_here') {
      return NextResponse.json({ 
        error: 'API key is not configured. Please update GEMINI_NANO_BANANA_API_KEY in your .env.local file.' 
      }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct the locked prompt based on style and quality
    let finalPrompt = prompt;
    if (style !== 'None') {
      finalPrompt += `\n\nStyle: ${style}.`;
    }
    if (quality === 'Premium') {
      finalPrompt += `\n\nQuality: Ultra high quality, 4k resolution, photorealistic, highly detailed, masterpiece, professional marketing asset.`;
    }

    // Build the contents array
    const contents: any[] = [finalPrompt];
    
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

// Build the image configuration (this is the correct schema for the API)
    const imageConfig: any = {
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
        } as any
      }).then(res => {
        console.log(`[Generate API] Successfully completed image ${index + 1}/${count}`);
        return res;
      }).catch(e => {
        console.error(`[Generate API] Single image generation failed for image ${index + 1}:`, e);
        return null;
      });
    });

    const responses = await Promise.all(promises);
    const imageUrls: string[] = [];

    for (const response of responses) {
      if (!response) continue;
      
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

    return NextResponse.json({ imageUrls });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
