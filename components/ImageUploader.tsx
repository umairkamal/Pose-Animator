
import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
    onImageUpload: (base64: string) => void;
    title: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, title }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String);
                onImageUpload(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full h-full flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold mb-4 text-cyan-300">{title}</h3>
            <div 
                onClick={handleClick}
                className="w-full h-64 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-400 transition-colors duration-300 bg-gray-700/50"
            >
                {imagePreview ? (
                    <img src={imagePreview} alt="Upload preview" className="max-w-full max-h-full object-contain rounded-md" />
                ) : (
                    <div className="text-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p>Click to upload an image</p>
                        <p className="text-xs">PNG, JPG, etc.</p>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};

export default ImageUploader;
