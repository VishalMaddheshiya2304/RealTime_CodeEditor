// src/services/codeExecutor.js

export class CodeExecutor {
    
    static async executeJavaScript(code, timeout = 5000) {
        return new Promise((resolve) => {
            try {
                // Capture console output
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;
                
                let output = '';
                let hasError = false;
                let errorMessage = '';
                
                // Override console methods
                console.log = (...args) => {
                    output += args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' ') + '\n';
                };
                
                console.error = (...args) => {
                    hasError = true;
                    errorMessage += args.map(arg => String(arg)).join(' ') + '\n';
                };
                
                console.warn = (...args) => {
                    output += '[WARN] ' + args.map(arg => String(arg)).join(' ') + '\n';
                };
                
                // Set timeout for execution
                const timeoutId = setTimeout(() => {
                    hasError = true;
                    errorMessage = 'Execution timeout: Code took longer than 5 seconds to execute';
                    
                    // Restore console
                    console.log = originalLog;
                    console.error = originalError;
                    console.warn = originalWarn;
                    
                    resolve({
                        success: false,
                        output: output.trim(),
                        error: errorMessage.trim(),
                        executionTime: timeout
                    });
                }, timeout);
                
                const startTime = Date.now();
                
                try {
                    // Execute the code
                    const result = eval(code);
                    
                    // If the result is not undefined and nothing was logged, show the result
                    if (result !== undefined && output.trim() === '') {
                        output = String(result);
                    }
                    
                    clearTimeout(timeoutId);
                    
                    // Restore console
                    console.log = originalLog;
                    console.error = originalError;
                    console.warn = originalWarn;
                    
                    const executionTime = Date.now() - startTime;
                    
                    resolve({
                        success: !hasError,
                        output: output.trim() || (hasError ? '' : 'Code executed successfully (no output)'),
                        error: hasError ? errorMessage.trim() : null,
                        executionTime
                    });
                    
                } catch (error) {
                    clearTimeout(timeoutId);
                    
                    // Restore console
                    console.log = originalLog;
                    console.error = originalError;
                    console.warn = originalWarn;
                    
                    const executionTime = Date.now() - startTime;
                    
                    resolve({
                        success: false,
                        output: output.trim(),
                        error: `${error.name}: ${error.message}`,
                        executionTime
                    });
                }
                
            } catch (error) {
                resolve({
                    success: false,
                    output: '',
                    error: `Execution Error: ${error.message}`,
                    executionTime: 0
                });
            }
        });
    }
    
    static async executeCode(language, code) {
        const startTime = Date.now();
        
        try {
            let result;
            
            switch (language) {
                case 'javascript':
                    result = await this.executeJavaScript(code);
                    break;
                case 'java':
                case 'cpp':
                    result = {
                        success: false,
                        output: '',
                        error: `${language.toUpperCase()} execution requires backend setup. Currently only JavaScript is supported.`,
                        executionTime: 0
                    };
                    break;
                default:
                    result = {
                        success: false,
                        output: '',
                        error: `Unsupported language: ${language}`,
                        executionTime: 0
                    };
            }
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                output: '',
                error: `Execution failed: ${error.message}`,
                executionTime: Date.now() - startTime
            };
        }
    }
}