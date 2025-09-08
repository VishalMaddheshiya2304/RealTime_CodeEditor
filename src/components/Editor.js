import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';

// Import language modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike'; // For Java and C++
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';

import ACTIONS from '../Actions';
import { getLanguageById } from '../config/languages';

const Editor = ({ socketRef, roomId, onCodeChange, language = 'javascript' }) => {
    const editorRef = useRef(null);
    const isInitialized = useRef(false);
    
    // Initialize editor only once
    useEffect(() => {
        if (!isInitialized.current) {
            async function init() {
                const languageConfig = getLanguageById(language);
                
                editorRef.current = Codemirror.fromTextArea(
                    document.getElementById('realtimeEditor'),
                    {
                        mode: languageConfig.codemirrorMode,
                        theme: 'dracula',
                        autoCloseTags: true,
                        autoCloseBrackets: true,
                        lineNumbers: true,
                        direction: 'ltr',
                        rtlMoveVisually: false,
                        indentUnit: 2,
                        tabSize: 2,
                        lineWrapping: true,
                        matchBrackets: true,
                        autoRefresh: true
                    }
                );

                // Set initial sample code
                editorRef.current.setValue(languageConfig.sample);

                editorRef.current.on('change', (instance, changes) => {
                    const { origin } = changes;
                    const code = instance.getValue();
                    onCodeChange(code);
                    if (origin !== 'setValue') {
                        socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
                            roomId,
                            code,
                        });
                    }
                });

                isInitialized.current = true;
                console.log('✅ Editor initialized with language:', language);
            }
            init();
        }
    }, []); // Empty dependency array - only run once

    // Handle language changes (separate from initialization)
    useEffect(() => {
        if (editorRef.current && isInitialized.current) {
            const languageConfig = getLanguageById(language);
            console.log('🔄 Changing editor language to:', language);
            
            // Get current code
            const currentCode = editorRef.current.getValue();
            
            // Change the mode
            editorRef.current.setOption('mode', languageConfig.codemirrorMode);
            
            // Only replace with sample code if:
            // 1. Editor is empty, OR
            // 2. Current content is a sample from another language
            const isSampleCode = Object.values(require('../config/languages').LANGUAGES)
                .some(lang => lang.sample.trim() === currentCode.trim());
            
            if (!currentCode.trim() || isSampleCode) {
                console.log('🔄 Replacing with new language sample');
                editorRef.current.setValue(languageConfig.sample);
            } else {
                console.log('🔄 Keeping existing code, just changing syntax highlighting');
            }
        }
    }, [language]); // Only depend on language changes

    // Handle socket events
    useEffect(() => {
        if (socketRef.current && editorRef.current) {
            const handleCodeChange = ({ code }) => {
                if (code !== null && editorRef.current) {
                    const currentCode = editorRef.current.getValue();
                    if (currentCode !== code) {
                        console.log('📡 Received code update from server');
                        editorRef.current.setValue(code);
                    }
                }
            };

            const handleLanguageUpdate = ({ language: newLanguage }) => {
                console.log('📡 Received language update:', newLanguage);
                // The parent component will handle the language change
            };

            socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);
            socketRef.current.on(ACTIONS.ROOM_LANGUAGE_UPDATE, handleLanguageUpdate);

            return () => {
                if (socketRef.current) {
                    socketRef.current.off(ACTIONS.CODE_CHANGE, handleCodeChange);
                    socketRef.current.off(ACTIONS.ROOM_LANGUAGE_UPDATE, handleLanguageUpdate);
                }
            };
        }
    }, [socketRef.current]); // Only re-run if socket changes

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;