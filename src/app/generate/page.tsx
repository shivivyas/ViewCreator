"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function GenerateImagePage() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setImageUrl(data.imageUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Generate Image</CardTitle>
          <CardDescription>
            Enter a prompt to generate an image using the Gemini Nano Banana API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="prompt" className="text-sm font-medium">Prompt</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic banana city..."
                className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive font-medium">
                Error: {error}
              </div>
            )}
            <Button type="submit" disabled={isLoading || !prompt.trim()}>
              {isLoading ? 'Generating...' : 'Generate Image'}
            </Button>
          </form>
        </CardContent>
        {imageUrl && (
          <CardFooter className="flex flex-col items-start gap-4 border-t pt-6 mt-2">
            <h3 className="text-lg font-semibold">Result</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={imageUrl} 
              alt={`Generated image for: ${prompt}`} 
              className="w-full rounded-md shadow-md object-contain"
            />
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
