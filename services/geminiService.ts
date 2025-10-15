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

export const generateOutline = async (script: string, prompts: PromptConfig): Promise<string[]> => {
    const prompt = prompts.outline.replace('...', `\`\`\`\n${script}\n\`\`\``);
    const schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };
    return generateWithRetry<string[]>(prompt, true, schema);
};

export const generateIntro = async (outlinePoint: string, userScript: string, prompts: PromptConfig): Promise<string> => {
    const filledPrompt = prompts.intro.replace('...', `"${outlinePoint}"`);
    const fullPrompt = `Đây là kịch bản gốc để tham khảo:\n"""\n${userScript}\n"""\n\nHãy thực hiện yêu cầu sau: ${filledPrompt}`;
    return generateWithRetry<string>(fullPrompt);
};

export const generateContent = async (outlinePoint: string, userScript: string, previousContent: string, prompts: PromptConfig): Promise<string> => {
    const filledPrompt = prompts.content.replace('...', `"${outlinePoint}"`);
    const fullPrompt = `Đây là kịch bản gốc để tham khảo:\n"""\n${userScript}\n"""\n\nĐây là nội dung đã được viết cho các phần trước đó:\n"""\n${previousContent}\n"""\n\nHãy thực hiện yêu cầu sau, đảm bảo nội dung mới liền mạch với phần trước: ${filledPrompt}`;
    return generateWithRetry<string>(fullPrompt);
};

interface SeoResult {
    title: string;
    description: string;
    keywords: string[];
}

export const generateSEO = async (title: string, prompts: PromptConfig): Promise<SeoResult> => {
    const prompt = `${prompts.seo}\n\n${title}`;
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
    const prompt = prompts.videoPrompt.replace('...', `\`\`\`\n${script}\n\`\`\``);
    return generateWithRetry<string>(prompt);
};

export const generateThumbnailFromTitle = async (title: string): Promise<string> => {
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
    const prompt = `Analyze the YouTube video at this URL: ${url}. 
    Your primary goal is to extract a detailed summary or transcript of the main spoken content.
    IT IS CRITICAL THAT YOU IGNORE ALL ADVERTISEMENTS. Do not include content from ads that may appear at the beginning, middle, or end of the video. Focus exclusively on the core content created by the channel owner.
    If a direct transcript is available, prefer that. Otherwise, provide a thorough summary of the video's topics.`;
    
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