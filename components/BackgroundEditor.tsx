import React, { useState, useEffect } from 'react';

interface BackgroundEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (background: { type: 'upload', image: string } | { type: 'prompt', prompt: string }) => void;
    baseImage: string | null;
    frameLabel: string;
}

type Mode = 'upload' | 'prompt';

const BackgroundEditor: React.FC<BackgroundEditorProps> = ({ isOpen, onClose, onSubmit, baseImage, frameLabel }) => {
    const [mode, setMode] = useState<Mode>('prompt');
    const [prompt, setPrompt] = useState('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setPrompt('');
            setUploadedImage(null);
            setIsProcessing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setUploadedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        setIsProcessing(true);
        if (mode === 'upload' && uploadedImage) {
            await onSubmit({ type: 'upload', image: uploadedImage });
        } else if (mode === 'prompt' && prompt) {
            await onSubmit({ type: 'prompt', prompt });
        }
        setIsProcessing(false);
    };

    const isSubmitDisabled = isProcessing || (mode === 'upload' && !uploadedImage) || (mode === 'prompt' && !prompt);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-cyan-300 capitalize">Edit <span className="text-white">{frameLabel}</span> Frame Background</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Preview */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Current Frame</h3>
                        {baseImage ? (
                             <img src={baseImage} alt="Frame to edit" className="rounded-lg shadow-md w-full h-auto border-2 border-gray-600" />
                        ) : (
                            <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">Loading...</div>
                        )}
                    </div>
                    
                    {/* Controls */}
                    <div className="flex flex-col">
                        <div className="flex border-b border-gray-700 mb-4">
                            {(['prompt', 'upload'] as Mode[]).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`capitalize px-4 py-2 font-semibold transition-colors duration-200 focus:outline-none ${mode === m ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {mode === 'prompt' && (
                             <div className="space-y-3">
                                <label htmlFor="bg-prompt" className="font-semibold text-gray-300">Describe the new background:</label>
                                <textarea
                                    id="bg-prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., a vibrant fantasy forest"
                                    rows={4}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        )}
                        {mode === 'upload' && (
                             <div>
                                <label htmlFor="bg-upload" className="w-full text-center cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300 block">
                                    {uploadedImage ? 'Change Image' : 'Upload Background Image'}
                                </label>
                                <input id="bg-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                {uploadedImage && <img src={uploadedImage} alt="Background preview" className="mt-4 rounded-md max-h-32 w-auto mx-auto"/>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-900/50 rounded-b-xl flex justify-end items-center space-x-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-semibold transition-colors duration-300">
                        Keep Original
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitDisabled} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white font-semibold transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                        {isProcessing && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isProcessing ? 'Applying...' : 'Apply Background'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BackgroundEditor;
