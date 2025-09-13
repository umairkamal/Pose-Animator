import React from 'react';

interface ResultDisplayProps {
    startFrameImage: string | null;
    endFrameImage: string | null;
    generatedVideoUrl: string | null;
    onGenerateVideo: () => void;
    isGeneratingVideo: boolean;
    animationPrompt: string;
    onAnimationPromptChange: (prompt: string) => void;
    onGenerateAiPrompt: () => void;
    isGeneratingAiPrompt: boolean;
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);


const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    startFrameImage, 
    endFrameImage, 
    generatedVideoUrl, 
    onGenerateVideo, 
    isGeneratingVideo,
    animationPrompt,
    onAnimationPromptChange,
    onGenerateAiPrompt,
    isGeneratingAiPrompt,
}) => {
    if (!startFrameImage) return null;

    const bothFramesReady = startFrameImage && endFrameImage;

    const downloadFile = (href: string, filename: string) => {
        const link = document.createElement('a');
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full bg-gray-800 p-6 rounded-lg shadow-lg mt-8 flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-cyan-300">Animation Keyframes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8">
                {/* Start Frame */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-2">
                        <h3 className="text-xl font-semibold">Start Frame</h3>
                        <button 
                            onClick={() => downloadFile(startFrameImage, 'start-frame.png')}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md text-white text-sm font-semibold transition-colors duration-300 flex items-center"
                            aria-label="Download Start Frame as PNG"
                        >
                            <DownloadIcon />
                            PNG
                        </button>
                    </div>
                    <img src={startFrameImage} alt="Start frame" className="rounded-lg shadow-md max-w-full h-auto border-4 border-gray-700" />
                </div>
                
                {/* End Frame */}
                <div className="flex flex-col items-center justify-center">
                     <div className="flex items-center justify-between w-full mb-2">
                        <h3 className="text-xl font-semibold">End Frame</h3>
                        {endFrameImage && (
                            <button 
                                onClick={() => downloadFile(endFrameImage, 'end-frame.png')}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md text-white text-sm font-semibold transition-colors duration-300 flex items-center"
                                aria-label="Download End Frame as PNG"
                            >
                                <DownloadIcon />
                                PNG
                            </button>
                        )}
                    </div>
                    {endFrameImage ? (
                        <img src={endFrameImage} alt="End frame" className="rounded-lg shadow-md max-w-full h-auto border-4 border-gray-700" />
                    ) : (
                        <div className="w-full h-64 flex items-center justify-center bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-500">
                           <p className="text-gray-400">Waiting for end frame...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Video Result & Generation Button */}
            {generatedVideoUrl ? (
                <div className="w-full flex flex-col items-center">
                    <h3 className="text-xl font-semibold mb-2 text-center">Final Animation</h3>
                    <video src={generatedVideoUrl} controls autoPlay loop className="rounded-lg shadow-md max-w-full h-auto border-4 border-gray-700 mb-4" />
                    <button 
                        onClick={() => downloadFile(generatedVideoUrl, 'animation.mp4')}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold text-lg shadow-lg transition-all duration-300 flex items-center"
                    >
                        <DownloadIcon />
                        Export Video (MP4)
                    </button>
                </div>
            ) : (
                bothFramesReady && (
                    <div className="w-full flex flex-col items-center justify-center rounded-lg p-4 space-y-6 bg-gray-900/50">
                        <div className="w-full max-w-2xl">
                            <label htmlFor="animation-prompt" className="block text-xl font-semibold mb-2 text-cyan-300">Animation Prompt</label>
                            <p className="text-sm text-gray-400 mb-3">Describe the animation from the start to the end frame. You can write your own prompt or generate an AI suggestion.</p>
                            <textarea
                                id="animation-prompt"
                                value={animationPrompt}
                                onChange={(e) => onAnimationPromptChange(e.target.value)}
                                placeholder="e.g., The character performs a smooth roundhouse kick..."
                                rows={3}
                                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                            />
                             <p className="text-xs text-gray-500 mt-2 px-1">
                                💡 <strong>Tip:</strong> Keep prompts descriptive and neutral (e.g., "character raises their arm"). The AI's safety filters may block ambiguous or aggressive-sounding actions. If you get an error, try rephrasing your prompt.
                            </p>
                             <div className="text-right mt-2">
                                <button 
                                    onClick={onGenerateAiPrompt} 
                                    disabled={isGeneratingAiPrompt}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-semibold text-sm transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ml-auto"
                                >
                                    {isGeneratingAiPrompt && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    {isGeneratingAiPrompt ? 'Generating...' : 'Generate AI Suggestion'}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onGenerateVideo}
                            disabled={isGeneratingVideo || !animationPrompt}
                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-bold text-lg shadow-lg transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center"
                        >
                            {isGeneratingVideo ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating Animation...
                                </>
                            ) : 'Animate It!'}
                        </button>
                    </div>
                )
            )}
        </div>
    );
};

export default ResultDisplay;