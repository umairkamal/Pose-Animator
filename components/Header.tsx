
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="w-full bg-gray-800 p-4 shadow-lg flex items-center justify-center">
            <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v4h-2zm0 6h2v2h-2z" opacity=".3"/>
                    <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8 8-3.59-8-8-8z"/>
                    <path d="M12 17.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-1.5-5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V13c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-1.5zM12 6.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5 1.5z"/>
                </svg>
                <h1 className="text-3xl font-bold text-white tracking-wider">Pose Animator AI</h1>
            </div>
        </header>
    );
};

export default Header;
