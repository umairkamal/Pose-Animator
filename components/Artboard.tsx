import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { generatePoseFromPrompt } from '../services/geminiService';

export interface ArtboardRef {
    getImageData: () => string;
    clearCanvas: () => void;
}

interface ArtboardProps {
    title: string;
}

type InputMode = 'draw' | 'upload' | 'prompt';
const BRUSH_SIZES = { Small: 3, Medium: 8, Large: 15 };
const COLORS = ['#000000', '#EF4444', '#22C55E', '#3B82F6', '#EAB308', '#A855F7'];

// --- Helper Components & Icons ---

const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8A5 5 0 009 9" />
  </svg>
);

const RedoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H8A5 5 0 013 9" />
  </svg>
);

// --- Main Component ---

const Artboard = forwardRef<ArtboardRef, ArtboardProps>(({ title }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // --- State Management ---
    const [mode, setMode] = useState<InputMode>('draw');
    const [brushColor, setBrushColor] = useState(COLORS[0]);
    const [brushSize, setBrushSize] = useState(BRUSH_SIZES.Medium);
    const [isSmoothing, setIsSmoothing] = useState(true);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [customCursor, setCustomCursor] = useState('crosshair');
    const [prompt, setPrompt] = useState('');
    const [isGeneratingPose, setIsGeneratingPose] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // --- Canvas & History Logic ---
    const getContext = useCallback(() => canvasRef.current?.getContext('2d'), []);

    const saveState = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(url);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const restoreCanvasFromHistory = useCallback(() => {
        const canvas = canvasRef.current;
        const context = getContext();
        if (!canvas || !context || history.length === 0 || historyIndex < 0) return;
        
        const url = history[historyIndex];
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = url;
    }, [history, historyIndex, getContext]);

    const initializeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const context = getContext();
        if (!canvas || !context) return;
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const initialUrl = canvas.toDataURL('image/png');
        // Reset the history to a single, blank state
        setHistory([initialUrl]);
        setHistoryIndex(0);
    }, [getContext]);

    useEffect(() => {
        initializeCanvas();
    }, [initializeCanvas]);

    useEffect(() => {
        restoreCanvasFromHistory();
    }, [historyIndex, restoreCanvasFromHistory]);

    // --- Drawing Logic & Effects ---
    useEffect(() => {
        const context = getContext();
        if (!context) return;
        context.strokeStyle = brushColor;
        context.lineWidth = brushSize;
        context.lineCap = 'round';
        context.lineJoin = 'round';

        // Update custom cursor
        const svg = `<svg width="${brushSize}" height="${brushSize}" xmlns="http://www.w3.org/2000/svg"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2}" fill="none" stroke="${brushColor}" stroke-width="1"/></svg>`;
        const cursorUrl = `url('data:image/svg+xml;base64,${btoa(svg)}') ${brushSize/2} ${brushSize/2}, crosshair`;
        setCustomCursor(cursorUrl);
    }, [brushColor, brushSize, getContext]);

    const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        const context = getContext();
        if (!context || mode !== 'draw') return;
        const { offsetX, offsetY } = nativeEvent;
        context.beginPath();
        context.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        lastPointRef.current = { x: offsetX, y: offsetY };
    };

    const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !lastPointRef.current || mode !== 'draw') return;
        const context = getContext();
        if (!context) return;
        const { offsetX, offsetY } = nativeEvent;

        if (isSmoothing) {
            const midPointX = (lastPointRef.current.x + offsetX) / 2;
            const midPointY = (lastPointRef.current.y + offsetY) / 2;
            context.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midPointX, midPointY);
        } else {
            context.lineTo(offsetX, offsetY);
        }
        context.stroke();
        lastPointRef.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        const context = getContext();
        if (!context) return;
        context.closePath();
        setIsDrawing(false);
        lastPointRef.current = null;
        saveState();
    };

    // --- Pose Loading Logic ---
    const loadPoseImageOntoCanvas = (base64Image: string) => {
        const canvas = canvasRef.current;
        const context = getContext();
        if (!canvas || !context) return;
        
        const img = new Image();
        img.onload = () => {
            // Clear and draw with aspect ratio preservation
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            const canvasAspect = canvas.width / canvas.height;
            const imgAspect = img.width / img.height;
            let drawWidth, drawHeight, dx, dy;

            if(canvasAspect > imgAspect){
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspect;
            } else {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspect;
            }
            dx = (canvas.width - drawWidth) / 2;
            dy = (canvas.height - drawHeight) / 2;

            context.drawImage(img, dx, dy, drawWidth, drawHeight);
            saveState();
        };
        img.src = base64Image;
    };

    const handlePoseUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => loadPoseImageOntoCanvas(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGeneratePose = async () => {
        if (!prompt) return;
        setIsGeneratingPose(true);
        setErrorMessage(null);
        try {
            const resultImage = await generatePoseFromPrompt(prompt);
            loadPoseImageOntoCanvas(resultImage);
        } catch (error) {
            setErrorMessage((error as Error).message);
        } finally {
            setIsGeneratingPose(false);
        }
    };

    // --- Undo/Redo Handlers ---
    const handleUndo = () => historyIndex > 0 && setHistoryIndex(prev => prev - 1);
    const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(prev => prev + 1);

    useImperativeHandle(ref, () => ({
        getImageData: () => canvasRef.current?.toDataURL('image/png') || '',
        clearCanvas: initializeCanvas,
    }));

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-cyan-300">{title}</h3>
                <button onClick={initializeCanvas} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors duration-300">
                    Clear
                </button>
            </div>

            {/* --- Mode Tabs --- */}
            <div className="flex border-b border-gray-700 mb-4">
                {(['draw', 'upload', 'prompt'] as InputMode[]).map(m => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`capitalize px-4 py-2 font-semibold transition-colors duration-200 focus:outline-none ${mode === m ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* --- Control Panel based on Mode --- */}
            <div className="mb-4 space-y-4">
                {mode === 'draw' && (
                     <div className="bg-gray-700/50 p-2 rounded-lg flex flex-wrap items-center justify-between gap-y-2">
                        <div className="flex items-center gap-2">
                            {COLORS.map(color => (
                                <button key={color} onClick={() => setBrushColor(color)} className={`w-7 h-7 rounded-full transition-transform transform hover:scale-110 border-2 ${brushColor === color ? 'border-cyan-400 scale-110' : 'border-gray-600'}`} style={{ backgroundColor: color }} aria-label={`Select color ${color}`} />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-600 p-1 rounded-full">
                            {Object.entries(BRUSH_SIZES).map(([name, size]) => (
                                <button key={name} onClick={() => setBrushSize(size)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${brushSize === size ? 'bg-cyan-500 text-white' : 'hover:bg-gray-500 text-gray-300'}`} aria-label={`Select brush size ${name}`}>
                                    <span className="text-xs font-bold">{name.charAt(0)}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-300">
                                <input type="checkbox" checked={isSmoothing} onChange={(e) => setIsSmoothing(e.target.checked)} className="form-checkbox h-5 w-5 bg-gray-600 border-gray-500 rounded text-cyan-500 focus:ring-cyan-600" />
                                Smoothing
                            </label>
                            <div className="flex items-center gap-1">
                                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-md transition-colors bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Undo"><UndoIcon /></button>
                                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md transition-colors bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Redo"><RedoIcon /></button>
                            </div>
                        </div>
                    </div>
                )}
                {mode === 'upload' && (
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <label htmlFor="pose-upload" className="w-full text-center cursor-pointer bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300 block">
                            Upload Pose Image
                        </label>
                        <input id="pose-upload" type="file" accept="image/*" onChange={handlePoseUpload} className="hidden" />
                    </div>
                )}
                {mode === 'prompt' && (
                    <div className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., a character doing a backflip"
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button onClick={handleGeneratePose} disabled={isGeneratingPose || !prompt} className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white font-semibold transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            {isGeneratingPose && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isGeneratingPose ? 'Generating...' : 'Generate Pose'}
                        </button>
                        {errorMessage && <p className="text-red-400 text-sm mt-2">{errorMessage}</p>}
                    </div>
                )}
            </div>
            
            <canvas
                ref={canvasRef}
                width="512"
                height="256"
                className="bg-white rounded-lg w-full h-64 border-2 border-gray-700"
                style={{ cursor: mode === 'draw' ? customCursor : 'default' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
        </div>
    );
});

export default Artboard;