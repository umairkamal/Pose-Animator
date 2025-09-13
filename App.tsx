import React, { useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import Artboard, { ArtboardRef } from './components/Artboard';
import ResultDisplay from './components/ResultDisplay';
import Loader from './components/Loader';
import BackgroundEditor from './components/BackgroundEditor';
import { AppState } from './types';
import { editImageWithPose, generateVideoFromFrames, changeBackgroundImage, describeAnimationBetweenFrames } from './services/geminiService';

const getFriendlyErrorMessage = (error: unknown): string => {
    const err = error as Error;
    let message = err.message || "An unknown error occurred.";

    // Check for common safety filter messages from the model
    const lowerCaseMessage = message.toLowerCase();
    if (lowerCaseMessage.includes('safety') || lowerCaseMessage.includes('blocked') || lowerCaseMessage.includes('policy')) {
        return "The request was blocked due to the AI's safety filters. This can happen if an image or prompt is misinterpreted. Please try modifying your prompt to be more descriptive and neutral (e.g., instead of 'kicks', try 'raises leg in an upward arc'), or adjust the input images.";
    }
    
    return message;
};


const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [startFrameImage, setStartFrameImage] = useState<string | null>(null);
    const [endFrameImage, setEndFrameImage] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [animationPrompt, setAnimationPrompt] = useState<string>('');
    const [isGeneratingAiPrompt, setIsGeneratingAiPrompt] = useState(false);

    const [isBgEditorOpen, setIsBgEditorOpen] = useState(false);
    const [editingFrame, setEditingFrame] = useState<'start' | 'end' | null>(null);

    const artboardRef = useRef<ArtboardRef>(null);

    const handleReset = () => {
        setAppState(AppState.IDLE);
        setErrorMessage(null);
        setUploadedImage(null);
        setStartFrameImage(null);
        setEndFrameImage(null);
        setGeneratedVideoUrl(null);
        setAnimationPrompt('');
        setIsBgEditorOpen(false);
        setEditingFrame(null);
        artboardRef.current?.clearCanvas();
    };

    const handleFrameGeneration = useCallback(async () => {
        const poseImage = artboardRef.current?.getImageData();
        if (!uploadedImage || !poseImage) {
            setErrorMessage("Please upload a character image and draw a pose first.");
            setAppState(AppState.ERROR);
            return;
        }

        const isGeneratingStartFrame = !startFrameImage;
        setLoadingMessage(isGeneratingStartFrame ? 'Generating Start Frame...' : 'Generating End Frame...');
        setAppState(AppState.GENERATING_IMAGE);
        setErrorMessage(null);
        if (isGeneratingStartFrame) {
            setGeneratedVideoUrl(null); // Reset video if starting over
            setAnimationPrompt(''); // And reset prompt
        }

        try {
            const resultImage = await editImageWithPose(uploadedImage, poseImage);
            if (isGeneratingStartFrame) {
                setStartFrameImage(resultImage);
                setEditingFrame('start');
            } else {
                setEndFrameImage(resultImage);
                setEditingFrame('end');
            }
            setIsBgEditorOpen(true);
            setAppState(AppState.IDLE); // Stop main loader, modal has its own
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error));
            setAppState(AppState.ERROR);
        }
    }, [uploadedImage, startFrameImage]);

    const handleBackgroundUpdate = async (background: { type: 'upload', image: string } | { type: 'prompt', prompt: string }) => {
        const frameToUpdate = editingFrame === 'start' ? startFrameImage : endFrameImage;
        if (!frameToUpdate) return;

        setErrorMessage(null);
        setLoadingMessage('Updating background...');
        setAppState(AppState.GENERATING_IMAGE);
        setIsBgEditorOpen(false);

        try {
            const updatedFrame = await changeBackgroundImage(frameToUpdate, background);
            if (editingFrame === 'start') {
                setStartFrameImage(updatedFrame);
                artboardRef.current?.clearCanvas(); 
            } else {
                setEndFrameImage(updatedFrame);
            }
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error));
            setAppState(AppState.ERROR);
        } finally {
            setEditingFrame(null);
            setAppState(AppState.IMAGE_READY);
        }
    };
    
    const handleCloseBgEditor = () => {
        if (editingFrame === 'start') {
            artboardRef.current?.clearCanvas();
        }
        setIsBgEditorOpen(false);
        setEditingFrame(null);
        setAppState(AppState.IMAGE_READY);
    };

    const handleGenerateAiPrompt = useCallback(async () => {
        if (!startFrameImage || !endFrameImage) return;
        setIsGeneratingAiPrompt(true);
        setErrorMessage(null);
        try {
            const description = await describeAnimationBetweenFrames(startFrameImage, endFrameImage);
            setAnimationPrompt(description);
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error));
            setAppState(AppState.ERROR);
        } finally {
            setIsGeneratingAiPrompt(false);
        }
    }, [startFrameImage, endFrameImage]);

    const handleVideoGeneration = useCallback(async () => {
        if (!startFrameImage || !animationPrompt) {
            setErrorMessage("A start frame and an animation prompt are required.");
            setAppState(AppState.ERROR);
            return;
        }

        setLoadingMessage('Generating animation from prompt...');
        setAppState(AppState.GENERATING_VIDEO);
        setErrorMessage(null);
        
        try {
            const videoUrl = await generateVideoFromFrames(startFrameImage, animationPrompt);
            setGeneratedVideoUrl(videoUrl);
            setAppState(AppState.VIDEO_READY);
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error));
            setAppState(AppState.ERROR);
        }
    }, [startFrameImage, animationPrompt]);

    const isLoading = appState === AppState.GENERATING_IMAGE || appState === AppState.GENERATING_VIDEO;

    const getWorkflowStep = () => {
        if (!uploadedImage) return '1. Upload Character';
        if (!startFrameImage) return '2. Create Start Frame';
        if (isBgEditorOpen && editingFrame === 'start') return '2. Edit Start Frame Background';
        if (!endFrameImage) return '3. Create End Frame';
        if (isBgEditorOpen && editingFrame === 'end') return '3. Edit End Frame Background';
        return '4. Write Prompt & Animate';
    };

    const getButtonText = () => {
        if (!startFrameImage) return 'Generate Start Frame';
        if (!endFrameImage) return 'Generate End Frame';
        return 'All Frames Generated';
    };
    
    const isGenerateButtonDisabled = isLoading || !uploadedImage || !!endFrameImage || isBgEditorOpen;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            {isLoading && <Loader message={loadingMessage} />}
            <BackgroundEditor
                isOpen={isBgEditorOpen}
                onClose={handleCloseBgEditor}
                onSubmit={handleBackgroundUpdate}
                baseImage={editingFrame === 'start' ? startFrameImage : endFrameImage}
                frameLabel={editingFrame || ''}
            />
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">Animate Between Keyframes</h2>
                    <p className="text-lg text-gray-300 max-w-3xl mx-auto">Upload a character, create keyframes with custom backgrounds, and let AI generate the animation.</p>
                </div>
                
                 {errorMessage && (
                    <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{errorMessage}</span>
                        <button onClick={() => setErrorMessage(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-200">&times;</button>
                    </div>
                )}
                
                <div className="bg-gray-800/50 rounded-lg p-4 mb-8 flex justify-between items-center shadow-inner">
                     <h3 className="text-xl font-bold text-cyan-300">Current Step: <span className="text-white">{getWorkflowStep()}</span></h3>
                     <button onClick={handleReset} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-semibold transition-colors duration-300">
                        Start Over
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div style={{ opacity: uploadedImage ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                        <ImageUploader onImageUpload={setUploadedImage} title="Upload Character" />
                    </div>
                    <Artboard ref={artboardRef} title={!startFrameImage ? 'Draw Start Pose' : 'Draw End Pose'} />
                </div>

                <div className="text-center">
                    <button 
                        onClick={handleFrameGeneration}
                        disabled={isGenerateButtonDisabled}
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xl rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {getButtonText()}
                    </button>
                </div>
                
                <ResultDisplay 
                    startFrameImage={startFrameImage}
                    endFrameImage={endFrameImage}
                    generatedVideoUrl={generatedVideoUrl}
                    onGenerateVideo={handleVideoGeneration}
                    isGeneratingVideo={appState === AppState.GENERATING_VIDEO}
                    animationPrompt={animationPrompt}
                    onAnimationPromptChange={setAnimationPrompt}
                    onGenerateAiPrompt={handleGenerateAiPrompt}
                    isGeneratingAiPrompt={isGeneratingAiPrompt}
                />
            </main>
        </div>
    );
};

export default App;