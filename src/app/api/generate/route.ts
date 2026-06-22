import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;

    if (!apiKey || apiKey === 'your_api_key_here') {
      return NextResponse.json({ 
        error: 'API key is not configured. Please update GEMINI_NANO_BANANA_API_KEY in your .env.local file.' 
      }, { status: 500 });
    }

    // Initialize the official Google Gen AI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Call the Gemini API for image generation
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image", // Nano Banana 2
      contents: prompt,
    });

    let base64Image = null;
    let mimeType = 'image/png';

    // Parse the response to extract the image
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          mimeType = part.inlineData.mimeType || mimeType;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error('API did not return an image.');
    }

    // Format as a data URL for the frontend <img> tag
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
