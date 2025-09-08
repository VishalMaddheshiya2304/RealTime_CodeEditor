const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',
    // Language-related events
    LANGUAGE_CHANGE: 'language-change',
    LANGUAGE_SYNC: 'language-sync',
    ROOM_LANGUAGE_UPDATE: 'room-language-update',
    // Code execution events
    EXECUTE_CODE: 'execute-code',
    EXECUTION_RESULT: 'execution-result',
    EXECUTION_ERROR: 'execution-error',
    EXECUTION_START: 'execution-start',
    CLEAR_OUTPUT: 'clear-output',
};

module.exports = ACTIONS;