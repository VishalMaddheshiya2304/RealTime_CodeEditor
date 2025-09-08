// src/components/LanguageSelector.js
import React from 'react';
import { getLanguagesList } from '../config/languages';

const LanguageSelector = ({ selectedLanguage, onLanguageChange, disabled = false }) => {
    const languages = getLanguagesList();

    return (
        <div className="languageSelector">
            <label htmlFor="language-select" className="languageLabel">
                Programming Language:
            </label>
            <select
                id="language-select"
                className="languageDropdown"
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                disabled={disabled}
            >
                {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                        {language.icon} {language.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;