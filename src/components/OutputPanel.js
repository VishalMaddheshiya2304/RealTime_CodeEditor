// src/components/OutputPanel.js
import React from 'react';

const OutputPanel = ({ 
    output, 
    isExecuting, 
    error, 
    onClearOutput, 
    executedBy,
    executionTime 
}) => {
    const formatOutput = (output) => {
        if (!output) return '';
        return output.split('\n').map((line, index) => (
            <div key={index} className="output-line">
                {line || '\u00A0'} {/* Non-breaking space for empty lines */}
            </div>
        ));
    };

    const formatError = (error) => {
        if (!error) return '';
        return error.split('\n').map((line, index) => (
            <div key={index} className="error-line">
                {line || '\u00A0'}
            </div>
        ));
    };

    return (
        <div className="outputPanel">
            <div className="outputHeader">
                <div className="outputTitle">
                    <span className="outputIcon">📟</span>
                    <span>Output Console</span>
                    {isExecuting && (
                        <span className="executingBadge">
                            <span className="spinner"></span>
                            Running...
                        </span>
                    )}
                </div>
                <div className="outputActions">
                    {executedBy && (
                        <span className="executedBy">
                            Last run by: <strong>{executedBy}</strong>
                            {executionTime && (
                                <span className="executionTime">
                                    ({executionTime}ms)
                                </span>
                            )}
                        </span>
                    )}
                    <button 
                        className="btn clearBtn"
                        onClick={onClearOutput}
                        disabled={isExecuting}
                        title="Clear Output"
                    >
                        Clear
                    </button>
                </div>
            </div>
            
            <div className="outputContent">
                {isExecuting ? (
                    <div className="executingMessage">
                        <div className="executingAnimation">
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                        </div>
                        <span>Executing code...</span>
                    </div>
                ) : (
                    <>
                        {!output && !error && (
                            <div className="emptyOutput">
                                <span className="emptyIcon">💭</span>
                                <span>Click "Run Code" to execute your program</span>
                            </div>
                        )}
                        
                        {output && (
                            <div className="outputSection">
                                <div className="outputSectionHeader">
                                    <span className="successIcon">✅</span>
                                    <span>Output:</span>
                                </div>
                                <div className="outputText">
                                    {formatOutput(output)}
                                </div>
                            </div>
                        )}
                        
                        {error && (
                            <div className="errorSection">
                                <div className="errorSectionHeader">
                                    <span className="errorIcon">❌</span>
                                    <span>Error:</span>
                                </div>
                                <div className="errorText">
                                    {formatError(error)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default OutputPanel;