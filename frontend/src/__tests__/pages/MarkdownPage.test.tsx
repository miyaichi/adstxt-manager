import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MarkdownPage from '../../pages/MarkdownPage';
import { AppProvider } from '../../context/AppContext';

// Mock fetch
global.fetch = jest.fn();

// Mock the markdown content
const mockMarkdownContent = `
# Test Help Page

## Section 1 {#section1}

This is section 1 content.

## Section 2 {#section2}

This is section 2 content.

<a id="custom-anchor"></a>

### Custom Anchor Section

This section has a custom anchor.
`;

describe('MarkdownPage Fragment Highlighting', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockMarkdownContent),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Remove any highlight classes that might persist
    document.querySelectorAll('.highlight-section').forEach((el) => {
      el.classList.remove('highlight-section');
    });
  });

  const renderMarkdownPage = (initialEntries: string[] = ['/help']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AppProvider>
          <MarkdownPage pageType="help" />
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('should highlight section when URL contains hash fragment', async () => {
    renderMarkdownPage(['/help#section1']);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/This is section 1 content/)).toBeInTheDocument();
    });

    // Wait a bit more for the highlight effect to be applied
    await waitFor(
      () => {
        const highlightedElement = document.querySelector('.highlight-section');
        expect(highlightedElement).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('should highlight section when URL contains query parameter', async () => {
    renderMarkdownPage(['/help?section=section2']);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/This is section 2 content/)).toBeInTheDocument();
    });

    // Wait for the highlight effect to be applied
    await waitFor(
      () => {
        const highlightedElement = document.querySelector('.highlight-section');
        expect(highlightedElement).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('should prioritize hash fragment over query parameter', async () => {
    // Create a mock element to simulate the target
    const mockElement = document.createElement('div');
    mockElement.id = 'custom-anchor';
    mockElement.textContent = 'Custom Anchor Section';
    document.body.appendChild(mockElement);

    // Mock scrollIntoView
    const scrollIntoViewMock = jest.fn();
    mockElement.scrollIntoView = scrollIntoViewMock;

    renderMarkdownPage(['/help?section=section1#custom-anchor']);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/This is section 1 content/)).toBeInTheDocument();
    });

    // The hash fragment should take priority, so custom-anchor should be targeted
    await waitFor(
      () => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center',
        });
      },
      { timeout: 500 }
    );

    // Clean up
    document.body.removeChild(mockElement);
  });

  it('should handle hash changes during navigation', async () => {
    renderMarkdownPage(['/help']);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/This is section 1 content/)).toBeInTheDocument();
    });

    // Create mock elements for sections
    const section1Element = document.createElement('div');
    section1Element.id = 'section1';
    const section2Element = document.createElement('div');
    section2Element.id = 'section2';
    document.body.appendChild(section1Element);
    document.body.appendChild(section2Element);

    const scrollIntoViewMock1 = jest.fn();
    const scrollIntoViewMock2 = jest.fn();
    section1Element.scrollIntoView = scrollIntoViewMock1;
    section2Element.scrollIntoView = scrollIntoViewMock2;

    // Simulate hash change
    window.location.hash = '#section1';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(
      () => {
        expect(scrollIntoViewMock1).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center',
        });
      },
      { timeout: 500 }
    );

    // Simulate another hash change
    window.location.hash = '#section2';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(
      () => {
        expect(scrollIntoViewMock2).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center',
        });
      },
      { timeout: 500 }
    );

    // Clean up
    document.body.removeChild(section1Element);
    document.body.removeChild(section2Element);
  });

  it('should remove existing highlights before adding new ones', async () => {
    renderMarkdownPage(['/help']);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/This is section 1 content/)).toBeInTheDocument();
    });

    // Create mock elements
    const element1 = document.createElement('div');
    element1.id = 'section1';
    element1.classList.add('highlight-section'); // Pre-existing highlight
    const element2 = document.createElement('div');
    element2.id = 'section2';
    document.body.appendChild(element1);
    document.body.appendChild(element2);

    const scrollIntoViewMock = jest.fn();
    element2.scrollIntoView = scrollIntoViewMock;

    // Simulate hash change to section2
    window.location.hash = '#section2';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(
      () => {
        // The old highlight should be removed
        expect(element1.classList.contains('highlight-section')).toBe(false);
        // The new element should be highlighted
        expect(element2.classList.contains('highlight-section')).toBe(true);
      },
      { timeout: 500 }
    );

    // Clean up
    document.body.removeChild(element1);
    document.body.removeChild(element2);
  });
});
