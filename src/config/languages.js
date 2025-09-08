// src/config/languages.js

export const LANGUAGES = {
    javascript: {
        id: 'javascript',
        name: 'JavaScript',
        mode: 'javascript',
        extension: '.js',
        icon: '🟨',
        sample: `// Welcome to JavaScript!
function greetUser(name) {
    console.log(\`Hello, \${name}!\`);
    return \`Welcome to the coding session!\`;
}

greetUser("Developer");`,
        codemirrorMode: { name: 'javascript', json: true }
    },
    java: {
        id: 'java',
        name: 'Java',
        mode: 'text/x-java',
        extension: '.java',
        icon: '☕',
        sample: `// Welcome to Java!
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        greetUser("Developer");
    }
    
    public static void greetUser(String name) {
        System.out.println("Hello, " + name + "!");
        System.out.println("Welcome to the coding session!");
    }
}`,
        codemirrorMode: 'text/x-java'
    },
    cpp: {
        id: 'cpp',
        name: 'C++',
        mode: 'text/x-c++src',
        extension: '.cpp',
        icon: '⚡',
        sample: `// Welcome to C++!
#include <iostream>
#include <string>

void greetUser(const std::string& name) {
    std::cout << "Hello, " << name << "!" << std::endl;
    std::cout << "Welcome to the coding session!" << std::endl;
}

int main() {
    std::cout << "Hello, World!" << std::endl;
    greetUser("Developer");
    return 0;
}`,
        codemirrorMode: 'text/x-c++src'
    }
};

export const DEFAULT_LANGUAGE = 'javascript';

export const getLanguageById = (id) => {
    return LANGUAGES[id] || LANGUAGES[DEFAULT_LANGUAGE];
};

export const getLanguagesList = () => {
    return Object.values(LANGUAGES);
};