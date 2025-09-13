
import React from 'react';

interface LoaderProps {
    message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-cyan-500 rounded-full animate-spin"></div>
            <p className="text-white text-xl mt-4 font-semibold">{message}</p>
            <p className="text-gray-300 text-md mt-2">Please wait, this may take a moment...</p>
        </div>
    );
};

export default Loader;
