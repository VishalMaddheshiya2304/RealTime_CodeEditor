// src/components/RunCodeButton.js
import React from 'react';
import { getLanguageById } from '../config/languages';

const RunCodeButton = ({ 
    onRunCode, 
    isExecuting, 
    language, 
    disabled = false 
}) => {
    const languageConfig = getLanguageById(language);
    
    const handleClick = () => {
        if (!isExecuting && !disabled) {
            onRunCode();
        }
    };

    const getButtonText = () => {
        if (isExecuting) {
            return (
                <>
                    <span className="buttonSpinner"></span>
                    Running...
                </>
            );
        }
        return (
            <>
                <span className="runIcon">▶️</span>
                Run {languageConfig.name}
            </>
        );
    };

    const getButtonClass = () => {
        let classes = 'btn runCodeBtn';
        if (isExecuting) classes += ' executing';
        if (disabled) classes += ' disabled';
        return classes;
    };

    return (
        <div className="runCodeButtonWrapper">
            <button 
                className={getButtonClass()}
                onClick={handleClick}
                disabled={isExecuting || disabled}
                title={`Execute ${languageConfig.name} code`}
            >
                {getButtonText()}
            </button>
            <div className="runCodeInfo">
                <span className="languageInfo">
                    {languageConfig.icon} {languageConfig.extension}
                </span>
                {isExecuting && (
                    <span className="executionStatus">
                        Please wait...
                    </span>
                )}
            </div>
        </div>
    );
};

export default RunCodeButton;