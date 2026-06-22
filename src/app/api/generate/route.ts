import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      aspectRatio = '1:1', 
      numberOfImages = 1,
      style = 'None',
      quality = 'Standard',
      referenceImage = null,
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
    
    if (referenceImage) {
      // referenceImage should be a base64 string "data:image/png;base64,iVBORw0KGgo..."
      const match = referenceImage.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        contents.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    const count = Math.min(Math.max(1, numberOfImages), 4); // Limit between 1 and 4
    
    // We make parallel requests to ensure we get exactly the requested number of images
    // as the API sometimes ignores numberOfImages parameter.
    const promises = Array.from({ length: count }).map(() => {
      return ai.models.generateContent({
        model: "gemini-3.1-flash-image", 
        contents,
        config: {
          responseModalities: ["IMAGE"],
          personGeneration: personGeneration || 'DONT_ALLOW',
          response_format: {
            image: { aspect_ratio: aspectRatio }
          }
        } as any
      }).catch(e => {
        console.error("Single image generation failed:", e);
        return null; // Handle individual failures gracefully
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
