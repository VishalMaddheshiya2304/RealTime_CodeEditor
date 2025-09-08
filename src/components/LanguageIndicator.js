// src/components/LanguageIndicator.js
import React from "react";
import { getLanguageById } from "../config/languages";

const LanguageIndicator = ({ languageId, showChangeButton = false, onChangeClick }) => {
  const language = getLanguageById(languageId);

  if (!language) return null;

  return (
    <>
      <div className="language-indicator">
        {/* Language Info */}
        <div className="language-info">
          <span className="language-icon">{language.icon}</span>
          <div className="language-details">
            <span className="language-name">{language.name}</span>
            <span className="language-extension">{language.extension}</span>
          </div>
        </div>

        {/* Change Button */}
        {showChangeButton && (
          <button
            onClick={onChangeClick}
            aria-label="Change Language"
            className="change-language-btn"
          >
            ▼
          </button>
        )}
      </div>

      {/* Component CSS */}
      <style>{`
        .language-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 360px;
          width: 100%;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 8px 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .language-indicator:hover {
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
        }

        .language-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .language-icon {
          font-size: 20px;
        }

        .language-details {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .language-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .language-extension {
          font-size: 12px;
          color: #6b7280;
        }

        .change-language-btn {
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          color: #4b5563;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .change-language-btn:hover {
          background: #f3f4f6;
          transform: scale(1.05);
        }

        .change-language-btn:active {
          background: #e5e7eb;
        }
      `}</style>
    </>
  );
};

export default LanguageIndicator;
