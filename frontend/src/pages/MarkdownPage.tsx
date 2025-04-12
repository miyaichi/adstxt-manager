import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'react-router-dom';
import rehypeRaw from 'rehype-raw';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import './MarkdownPage.css';

export interface MarkdownPageProps {
  pageType: 'help' | 'privacy' | 'terms'; // Type of page to display
  sectionParam?: string; // Parameter name for section anchors in URL (default: 'section')
}

export const MarkdownPage: React.FC<MarkdownPageProps> = ({
  pageType,
  sectionParam = 'section',
}) => {
  const [markdown, setMarkdown] = useState('');
  const [searchParams] = useSearchParams();
  const sectionId = searchParams.get(sectionParam);
  const langParam = searchParams.get('lang');
  const { language, setLanguage } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map pageType to directory
  const getPageDirectory = () => {
    switch (pageType) {
      case 'privacy':
        return 'privacy';
      case 'terms':
        return 'terms';
      case 'help':
      default:
        return 'help';
    }
  };

  // Map pageType to filename
  const getPageFilename = () => {
    switch (pageType) {
      case 'privacy':
        return 'privacy-policy.md';
      case 'terms':
        return 'terms-of-service.md';
      case 'help':
      default:
        return 'warnings.md';
    }
  };

  // If there's a lang parameter in the URL, use it to update the app language
  useEffect(() => {
    if (langParam && ['en', 'ja'].includes(langParam) && langParam !== language) {
      setLanguage(langParam);
    }
  }, [langParam, language, setLanguage]);

  useEffect(() => {
    // Determine the language to use, fall back to English if needed
    const locale = language || 'en';
    const directory = getPageDirectory();
    const filename = getPageFilename();

    // Fetch the appropriate markdown file
    fetch(`/${directory}/${locale}/${filename}`)
      .then((res) => {
        if (!res.ok) {
          // If the specific language is not available, fall back to English
          if (locale !== 'en') {
            return fetch(`/${directory}/en/${filename}`);
          }
          throw new Error(`Failed to load content: ${res.status}`);
        }
        return res;
      })
      .then((res) => res.text())
      .then((text) => {
        setMarkdown(text);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(`Failed to load ${pageType} content`, err);
        setError(t('common.loadingError', language));
        setIsLoading(false);
      });
  }, [language, pageType]);

  useEffect(() => {
    // Scroll to the specific section if provided
    if (sectionId && !isLoading) {
      setTimeout(() => {
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
          sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a highlight class temporarily
          sectionElement.classList.add('highlight-section');
          setTimeout(() => {
            sectionElement.classList.remove('highlight-section');
          }, 5000);
        }
      }, 100); // Small delay to ensure the DOM is ready
    }
  }, [sectionId, isLoading, markdown]);

  // Modify the markdown content to remove the top-level header
  const processMarkdown = (content: string) => {
    // Remove the first heading line and the blank line that follows
    return content.replace(/^# .*?\n\n/, '');
  };

  return (
    <div className="markdown-page-container">
      {isLoading ? (
        <div className="loading">{t('common.loading', language)}</div>
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

export default MarkdownPage;
