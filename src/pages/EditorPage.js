import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import LanguageIndicator from '../components/LanguageIndicator';
import LanguageSelector from '../components/LanguageSelector';
import OutputPanel from '../components/OutputPanel';
import RunCodeButton from '../components/RunCodeButton';
import { initSocket } from '../socket';
import { DEFAULT_LANGUAGE, getLanguageById } from '../config/languages';
import { CodeExecutor } from '../services/codeExecutor';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [roomLanguage, setRoomLanguage] = useState(DEFAULT_LANGUAGE);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    
    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [output, setOutput] = useState('');
    const [executionError, setExecutionError] = useState('');
    const [executedBy, setExecutedBy] = useState('');
    const [executionTime, setExecutionTime] = useState(0);

    useEffect(() => {
        const init = async () => {
            try {
                socketRef.current = await initSocket();
                socketRef.current.on('connect_error', (err) => handleErrors(err));
                socketRef.current.on('connect_failed', (err) => handleErrors(err));

                function handleErrors(e) {
                    console.log('socket error', e);
                    toast.error('Socket connection failed, try again later.');
                    reactNavigator('/');
                }

                // Join room with language preference
                const userLanguage = location.state?.language || DEFAULT_LANGUAGE;
                socketRef.current.emit(ACTIONS.JOIN, {
                    roomId,
                    username: location.state?.username,
                    language: userLanguage,
                });

                // Handle joined events
                socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                    }
                    setClients(clients);
                    
                    if (socketId !== socketRef.current.id) {
                        socketRef.current.emit(ACTIONS.SYNC_CODE, {
                            code: codeRef.current,
                            socketId,
                        });
                    }
                });

                // Handle disconnections
                socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients(prevClients => 
                        prevClients.filter(client => client.socketId !== socketId)
                    );
                });

                // Handle language sync
                socketRef.current.on(ACTIONS.LANGUAGE_SYNC, ({ language }) => {
                    console.log('🔧 Syncing to room language:', language);
                    setRoomLanguage(language);
                    const languageConfig = getLanguageById(language);
                    toast.success(`Room language: ${languageConfig.name}`);
                });

                // Handle language updates
                socketRef.current.on(ACTIONS.ROOM_LANGUAGE_UPDATE, ({ language, changedBy }) => {
                    console.log('🔧 Language updated by', changedBy, 'to:', language);
                    setRoomLanguage(language);
                    const languageConfig = getLanguageById(language);
                    toast.success(`${changedBy} changed language to ${languageConfig.name}`);
                });

                // Handle execution events - FIXED to prevent sync issues
                socketRef.current.on(ACTIONS.EXECUTION_START, ({ executedBy: user }) => {
                    // Only update for OTHER users, not the executor
                    if (user !== location.state?.username) {
                        setIsExecuting(true);
                        setExecutedBy(user);
                        toast.success(`${user} is running the code...`);
                    }
                });

                socketRef.current.on(ACTIONS.EXECUTION_RESULT, ({ 
                    output: resultOutput, 
                    executedBy: user, 
                    executionTime: time 
                }) => {
                    // Only update for OTHER users since executor handles locally
                    if (user !== location.state?.username) {
                        setIsExecuting(false);
                        setOutput(resultOutput);
                        setExecutionError('');
                        setExecutedBy(user);
                        setExecutionTime(time);
                        toast.success(`Code executed by ${user}`);
                    }
                });

                socketRef.current.on(ACTIONS.EXECUTION_ERROR, ({ 
                    error, 
                    executedBy: user, 
                    executionTime: time 
                }) => {
                    // Only update for OTHER users since executor handles locally
                    if (user !== location.state?.username) {
                        setIsExecuting(false);
                        setOutput('');
                        setExecutionError(error);
                        setExecutedBy(user);
                        setExecutionTime(time);
                        toast.error(`Execution failed (by ${user})`);
                    }
                });

                socketRef.current.on(ACTIONS.CLEAR_OUTPUT, ({ clearedBy }) => {
                    setOutput('');
                    setExecutionError('');
                    setExecutedBy('');
                    setExecutionTime(0);
                    if (clearedBy !== location.state?.username) {
                        toast.success(`Output cleared by ${clearedBy}`);
                    }
                });

            } catch (error) {
                console.error('Failed to initialize socket:', error);
                toast.error('Failed to connect to server');
                reactNavigator('/');
            }
        };
        
        init();
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.LANGUAGE_SYNC);
                socketRef.current.off(ACTIONS.ROOM_LANGUAGE_UPDATE);
                socketRef.current.off(ACTIONS.EXECUTION_START);
                socketRef.current.off(ACTIONS.EXECUTION_RESULT);
                socketRef.current.off(ACTIONS.EXECUTION_ERROR);
                socketRef.current.off(ACTIONS.CLEAR_OUTPUT);
            }
        };
    }, [roomId, location.state?.username, reactNavigator]);

    const handleLanguageChange = (newLanguage) => {
        if (newLanguage !== roomLanguage) {
            console.log('🔧 Requesting language change to:', newLanguage);
            socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
                roomId,
                language: newLanguage
            });
        }
        setShowLanguageSelector(false);
    };

    const handleRunCode = async () => {
        if (isExecuting || !codeRef.current) return;
        
        const code = codeRef.current.trim();
        if (!code) {
            toast.error('No code to execute');
            return;
        }

        // Set local executing state immediately
        setIsExecuting(true);
        setExecutedBy(location.state?.username);
        
        // Notify other users that execution is starting
        socketRef.current.emit(ACTIONS.EXECUTE_CODE, {
            roomId,
            language: roomLanguage,
            code,
            executedBy: location.state?.username
        });
        
        try {
            const result = await CodeExecutor.executeCode(roomLanguage, code);
            
            // Update local state immediately for the executor
            setIsExecuting(false);
            setExecutionTime(result.executionTime);
            
            if (result.success) {
                // Set local output first
                setOutput(result.output);
                setExecutionError('');
                
                // Then broadcast to others
                socketRef.current.emit(ACTIONS.EXECUTION_RESULT, {
                    roomId,
                    output: result.output,
                    executedBy: location.state?.username,
                    executionTime: result.executionTime
                });
            } else {
                // Set local error first
                setOutput('');
                setExecutionError(result.error);
                
                // Then broadcast to others
                socketRef.current.emit(ACTIONS.EXECUTION_ERROR, {
                    roomId,
                    error: result.error,
                    executedBy: location.state?.username,
                    executionTime: result.executionTime
                });
            }
        } catch (error) {
            // Handle local error immediately
            setIsExecuting(false);
            setOutput('');
            setExecutionError(`Unexpected error: ${error.message}`);
            setExecutionTime(0);
            
            // Broadcast error to others
            socketRef.current.emit(ACTIONS.EXECUTION_ERROR, {
                roomId,
                error: `Unexpected error: ${error.message}`,
                executedBy: location.state?.username,
                executionTime: 0
            });
        }
    };

    const handleClearOutput = () => {
        // Clear local state immediately
        setOutput('');
        setExecutionError('');
        setExecutedBy('');
        setExecutionTime(0);
        
        // Then notify others
        socketRef.current.emit(ACTIONS.CLEAR_OUTPUT, {
            roomId,
            clearedBy: location.state?.username
        });
    };

    const toggleLanguageSelector = () => {
        setShowLanguageSelector(!showLanguageSelector);
    };

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-syn.jpg"
                            alt="logo"
                        />
                    </div>
                    
                    {/* Language Section */}
                    <div className="languageSection">
                        <h4>Language</h4>
                        {showLanguageSelector ? (
                            <div className="languageSelectorWrapper">
                                <LanguageSelector
                                    selectedLanguage={roomLanguage}
                                    onLanguageChange={handleLanguageChange}
                                />
                                <button 
                                    className="btn cancelBtn"
                                    onClick={() => setShowLanguageSelector(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <LanguageIndicator
                                languageId={roomLanguage}
                                showChangeButton={true}
                                onChangeClick={toggleLanguageSelector}
                            />
                        )}
                    </div>

                    {/* Run Code Section */}
                    <div className="runSection">
                        <RunCodeButton
                            onRunCode={handleRunCode}
                            isExecuting={isExecuting}
                            language={roomLanguage}
                            disabled={!codeRef.current}
                        />
                    </div>

                    {/* Connected Users Section */}
                    <h3>Connected ({clients.length})</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            
            <div className="editorSection">
                <div className="editorWrap">
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        language={roomLanguage}
                        onCodeChange={(code) => {
                            codeRef.current = code; 
                        }}
                    />
                </div>
                
                <div className="outputWrap">
                    <OutputPanel
                        output={output}
                        isExecuting={isExecuting}
                        error={executionError}
                        onClearOutput={handleClearOutput}
                        executedBy={executedBy}
                        executionTime={executionTime}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditorPage;