import React from 'react';
import { useApp } from '../../context/AppContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, useSystemLanguage, setUseSystemLanguage } = useApp();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'system') {
      setUseSystemLanguage(true);
    } else {
      setLanguage(e.target.value);
    }
  };

  return (
    <div className="language-switcher">
      <select
        value={useSystemLanguage ? 'system' : language}
        onChange={handleLanguageChange}
        aria-label="Select language"
        className="language-select"
      >
        <option value="system">System (Browser) Default</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
