import { GoogleGenAI, Type } from "@google/genai";
import type { PromptConfig } from '../types';

if (!process.env.API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this environment, we assume API_KEY is set.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "YOUR_API_KEY" });

export const checkApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey || apiKey.trim() === "") {
        return false;
    }
    try {
        const testAi = new GoogleGenAI({ apiKey });
        await testAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'test',
            config: {
                maxOutputTokens: 2,
            }
        });
        return true;
    } catch (error) {
        console.error("API Key check failed:", error);
        return false;
    }
};


const generateWithRetry = async <T,>(
    prompt: string, 
    isJson: boolean = false, 
    jsonSchema: any = null
): Promise<T> => {
    let attempts = 3;
    while (attempts > 0) {
        try {
            const config = isJson ? { 
                responseMimeType: "application/json",
                responseSchema: jsonSchema
            } : {};

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                ...(isJson && { config }),
            });

            const text = response.text.trim();
            if (isJson) {
                try {
                    // Sometimes the response might have ```json ... ``` markdown, remove it.
                    const cleanJson = text.replace(/^```json\s*|```$/g, '');
                    return JSON.parse(cleanJson) as T;
                } catch (e) {
                    console.error("Failed to parse JSON:", text);
                    throw new Error("Invalid JSON response from API");
                }
            }
            return text as T;
        } catch (error) {
            attempts--;
            console.error(`API call failed. Attempts left: ${attempts}`, error);
            if (attempts === 0) {
                throw error;
            }
            await new Promise(res => setTimeout(res, 1500)); // wait before retrying
        }
    }
    throw new Error("API call failed after multiple retries.");
};

export const generateOutline = async (title: string, prompts: PromptConfig): Promise<string[]> => {
    const prompt = prompts.outline.replace('{title}', title);
    const schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };
    return generateWithRetry<string[]>(prompt, true, schema);
};

export const generateIntro = async (title: string, outlinePoint: string, prompts: PromptConfig): Promise<string> => {
    const prompt = prompts.intro.replace('{title}', title).replace('{outlinePoint}', outlinePoint);
    return generateWithRetry<string>(prompt);
};

export const generateContent = async (title: string, outlinePoint: string, prompts: PromptConfig): Promise<string> => {
    const prompt = prompts.content.replace('{title}', title).replace('{outlinePoint}', outlinePoint);
    return generateWithRetry<string>(prompt);
};

interface SeoResult {
    title: string;
    description: string;
    keywords: string[];
}

export const generateSEO = async (title: string, script: string, prompts: PromptConfig): Promise<SeoResult> => {
    const prompt = prompts.seo.replace('{title}', title).replace('{script}', script.substring(0, 15000)); // Truncate script to avoid exceeding token limits
    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["title", "description", "keywords"]
    };
    return generateWithRetry<SeoResult>(prompt, true, schema);
};

export const generateVideoPrompts = async (script: string, prompts: PromptConfig): Promise<string> => {
    const prompt = prompts.videoPrompt.replace('{script}', script.substring(0, 15000));
    return generateWithRetry<string>(prompt);
};

export const generateThumbnail = async (title: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Create a visually stunning and compelling YouTube thumbnail for a video titled: "${title}". Cinematic, high-resolution, vibrant colors, clear focus.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Thumbnail generation failed:", error);
        // Fallback to a placeholder
        const placeholderResponse = await fetch(`https://picsum.photos/1280/720`);
        const blob = await placeholderResponse.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};

export const fetchYouTubeTranscript = async (url: string): Promise<string> => {
    if (!url || !url.startsWith('http')) {
        throw new Error("Vui lòng nhập một link YouTube hợp lệ.");
    }
    const prompt = `Provide a detailed summary or transcript of the video at this URL: ${url}. Focus on extracting the main spoken content. If a direct transcript is available, prefer that.`;
    
    let attempts = 3;
    while (attempts > 0) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            const text = response.text.trim();
            if (!text) {
                throw new Error("Không nhận được nội dung từ video. Video có thể không có phụ đề hoặc không thể truy cập.");
            }
            return text;
        } catch (error) {
            attempts--;
            console.error(`Transcript fetch failed. Attempts left: ${attempts}`, error);
            if (attempts === 0) {
                const specificError = error instanceof Error ? error.message : "Lỗi không xác định";
                throw new Error(`Không thể lấy transcript sau nhiều lần thử. Lỗi: ${specificError}`);
            }
            await new Promise(res => setTimeout(res, 2000)); // wait before retrying
        }
    }
    throw new Error("Không thể lấy transcript sau nhiều lần thử.");
};