import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSearchParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const sectionIdFromHash = location.hash.replace('#', '');
  // Use only hash fragment for section navigation
  const sectionId = sectionIdFromHash;
  
  const langParam = searchParams.get('lang');
  const { language, setLanguage } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to highlight a section element
  const highlightSection = React.useCallback((targetId: string) => {
    if (!targetId || isLoading) return;
    
    setTimeout(() => {
      const sectionElement = document.getElementById(targetId);
      
      if (sectionElement) {
        // Remove any existing highlight first
        document.querySelectorAll('.highlight-section').forEach(el => {
          el.classList.remove('highlight-section');
        });
        
        // If the element is an empty anchor, try to highlight the next heading element
        let elementToHighlight = sectionElement;
        if (sectionElement.tagName === 'A' && (!sectionElement.textContent || sectionElement.textContent.trim() === '')) {
          // Look for the next heading element after the anchor
          let nextElement = sectionElement.nextElementSibling;
          
          // If no direct sibling, try parent's next sibling
          if (!nextElement && sectionElement.parentElement) {
            nextElement = sectionElement.parentElement.nextElementSibling;
          }
          
          // Find the next heading
          while (nextElement) {
            if (nextElement.nodeType === Node.ELEMENT_NODE && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(nextElement.tagName)) {
              elementToHighlight = nextElement as HTMLElement;
              break;
            }
            nextElement = nextElement.nextElementSibling;
          }
        }
        
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elementToHighlight.classList.add('highlight-section');
        setTimeout(() => {
          elementToHighlight.classList.remove('highlight-section');
        }, 5000);
      }
    }, 100);
  }, [isLoading]);

  // Map pageType to directory
  const getPageDirectory = React.useCallback(() => {
    switch (pageType) {
      case 'privacy':
        return 'privacy';
      case 'terms':
        return 'terms';
      case 'help':
      default:
        return 'help';
    }
  }, [pageType]);

  // Map pageType to filename
  const getPageFilename = React.useCallback(() => {
    switch (pageType) {
      case 'privacy':
        return 'privacy-policy.md';
      case 'terms':
        return 'terms-of-service.md';
      case 'help':
      default:
        return 'warnings.md';
    }
  }, [pageType]);

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
  }, [language, pageType, getPageDirectory, getPageFilename]);

  useEffect(() => {
    // Scroll to the specific section if provided
    if (sectionId) {
      highlightSection(sectionId);
    }
  }, [sectionId, highlightSection, markdown]);

  // Listen for hash changes to handle browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash) {
        highlightSection(newHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [highlightSection]);

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
