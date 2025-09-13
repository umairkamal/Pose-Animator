import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const base64ToGeminiPart = (base64: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64.split(',')[1],
            mimeType
        },
    };
};

export const editImageWithPose = async (baseImage: string, poseImage: string): Promise<string> => {
    const baseImagePart = base64ToGeminiPart(baseImage, 'image/png');
    const poseImagePart = base64ToGeminiPart(poseImage, 'image/png');

    const prompt = "You are an expert animator. The user has provided two images. The first is the subject character, and the second is a simple stick-figure drawing of a pose. Your task is to redraw the subject character from the first image, making them adopt the pose shown in the stick-figure drawing. Preserve the original character's design, style, and background. The output should be only the newly generated image.";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    baseImagePart,
                    poseImagePart,
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image was generated.");

    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to generate the posed image. Please check the console for details.");
    }
};

export const describeAnimationBetweenFrames = async (startFrame: string, endFrame: string): Promise<string> => {
    const startFramePart = base64ToGeminiPart(startFrame, 'image/png');
    const endFramePart = base64ToGeminiPart(endFrame, 'image/png');
    const prompt = `You are a world-class animation director creating a prompt for a generative video AI. You will be given a start frame and an end frame. Your task is to write a highly detailed, descriptive prompt that guides the AI to create a smooth, physically plausible animation transitioning from the start frame to the end frame.
Instructions:
1. **Analyze the Motion:** Carefully compare the character's pose in both frames. Identify the primary action (e.g., kicking, punching, turning, jumping).
2. **Describe the Arc of Motion:** Do not just state the start and end. Describe the path the limbs and body take. Use words like "arcs," "sweeps," "unfolds," "rotates smoothly."
3. **Specify Timing and Pacing:** Add keywords that suggest the speed of the motion. Use terms like "slowly," "gracefully," "swiftly," "explosively," "with a slight pause."
4. **Keep the Character Consistent:** Emphasize that the character's appearance, clothing, and the background should remain consistent throughout the animation.
5. **Output Format:** The output should be a single, concise paragraph.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [startFramePart, endFramePart, { text: prompt }] },
    });
    
    return response.text.trim();
};

export const generateVideoFromFrames = async (startFrame: string, userPrompt: string): Promise<string> => {
    try {
        const prompt = `Create a high-quality, smooth, and fluid animation of the character in the provided image. The animation must start *exactly* from the pose in the image. The character should transition realistically to an end pose, following this detailed description of the motion: "${userPrompt}". It is crucial that the character's design, clothing, and the background remain completely consistent throughout the entire video.`;

        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt,
            image: {
                imageBytes: startFrame.split(',')[1],
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            
            if (operation.error) {
                const errorMessage = `Video generation failed with code ${operation.error.code}: ${operation.error.message}`;
                console.error("Video operation error:", operation.error);
                throw new Error(errorMessage);
            }
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found. The operation might have failed silently on the backend. Please check the model's content policies.");
        }
        
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if(!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }
        const blob = await videoResponse.blob();
        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Error generating video:", error);
        if (error instanceof Error && (error.message.startsWith('Video generation failed') || error.message.startsWith('Video generation completed'))) {
             throw error;
        }
        throw new Error("Failed to generate the animation. Please check the console for details.");
    }
};

export const generatePoseFromPrompt = async (prompt: string): Promise<string> => {
    try {
        const fullPrompt = `Generate a minimalist, single-color (black) stick figure drawing on a pure white background. The drawing should clearly depict the following pose: "${prompt}". The image should be clean, simple, and suitable as a pose reference. The final image should have an aspect ratio of 1:1.`;
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating pose from prompt:", error);
        throw new Error("Failed to generate the pose from the prompt. Please try again.");
    }
};

export const changeBackgroundImage = async (
    characterImage: string,
    background: { type: 'upload', image: string } | { type: 'prompt', prompt: string }
): Promise<string> => {
    try {
        const characterImagePart = base64ToGeminiPart(characterImage, 'image/png');
        
        let parts: any[] = [characterImagePart];
        let promptText: string;

        if (background.type === 'upload') {
            const backgroundImagePart = base64ToGeminiPart(background.image, 'image/png');
            parts.push(backgroundImagePart);
            promptText = "You are an expert image editor. You are given two images. The first image contains a character. The second image is a new background. Your task is to accurately cut out the character from the first image and place them seamlessly onto the new background from the second image. Preserve the character's appearance, lighting, and style as much as possible, and blend them naturally with the new environment.";
        } else { // type === 'prompt'
            promptText = `You are an expert image editor. You are given an image of a character. Your task is to replace the existing background with a new one based on the following description: "${background.prompt}". Accurately preserve the character in the foreground and blend them seamlessly and naturally with the newly generated background.`;
        }
        
        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image was generated when changing background.");
    } catch (error) {
        console.error("Error changing background:", error);
        throw new Error("Failed to change the background. Please check the console for details.");
    }
};