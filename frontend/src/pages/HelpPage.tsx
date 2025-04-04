import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'react-router-dom';
import rehypeRaw from 'rehype-raw';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import './HelpPage.css';

export const HelpPage: React.FC = () => {
  const [markdown, setMarkdown] = useState('');
  const [searchParams] = useSearchParams();
  const warningId = searchParams.get('warning');
  const { language } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Determine the language to use, fall back to English if needed
    const locale = language || 'en';

    // Fetch the appropriate markdown file
    fetch(`/help/${locale}/warnings.md`)
      .then((res) => {
        if (!res.ok) {
          // If the specific language is not available, fall back to English
          if (locale !== 'en') {
            return fetch('/help/en/warnings.md');
          }
          throw new Error(`Failed to load help content: ${res.status}`);
        }
        return res;
      })
      .then((res) => res.text())
      .then((text) => {
        setMarkdown(text);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load help content', err);
        setError(t('helpPage.error', language));
        setIsLoading(false);
      });
  }, [language]);

  useEffect(() => {
    // Scroll to the specific warning section if provided
    if (warningId && !isLoading) {
      setTimeout(() => {
        const warningElement = document.getElementById(warningId);
        const element = warningElement?.parentElement?.nextElementSibling;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a highlight class temporarily
          element.classList.add('highlight-section');
          setTimeout(() => {
            element.classList.remove('highlight-section');
          }, 5000);
        }
      }, 100); // Small delay to ensure the DOM is ready
    }
  }, [warningId, isLoading, markdown]);

  // Modify the markdown content to remove the top-level header
  const processMarkdown = (content: string) => {
    // Remove the first heading line and the blank line that follows
    return content.replace(/^# .*?\n\n/, '');
  };

  return (
    <div className="help-container">
      {isLoading ? (
        <div className="loading">{t('helpPage.loading', language)}</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="markdown-content">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{processMarkdown(markdown)}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default HelpPage;
