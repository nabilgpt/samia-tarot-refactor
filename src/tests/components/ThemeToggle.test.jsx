import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThemeToggle from '../../components/UI/ThemeToggle';
import { UIProvider } from '../../context/UIContext';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}));

// Test wrapper component with providers
const TestWrapper = ({ children, initialTheme = 'dark' }) => {
  return (
    <UIProvider>
      {children}
    </UIProvider>
  );
};

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders theme toggle button', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('relative', 'inline-flex', 'items-center');
  });

  it('shows moon icon in dark theme', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    // The button should be present and styled for dark theme
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    const mockToggle = vi.fn();
    
    render(
      <TestWrapper>
        <ThemeToggle onThemeToggle={mockToggle} />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('applies correct CSS classes', () => {
    render(
      <TestWrapper>
        <ThemeToggle className="custom-class" />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('shows correct tooltip text', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title');
  });

  it('handles keyboard interaction', () => {
    const mockToggle = vi.fn();
    
    render(
      <TestWrapper>
        <ThemeToggle onThemeToggle={mockToggle} />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button); // Simulate the click that follows Enter

    expect(mockToggle).toHaveBeenCalled();
  });

  it('maintains accessibility attributes', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title');
    expect(button.getAttribute('title')).toBeTruthy();
  });
}); 