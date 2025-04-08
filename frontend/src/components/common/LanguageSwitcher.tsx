import React from 'react';
import { useApp } from '../../context/AppContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useApp();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="language-switcher">
      <select
        value={language}
        onChange={handleLanguageChange}
        aria-label="Select language"
        className="language-select"
      >
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
