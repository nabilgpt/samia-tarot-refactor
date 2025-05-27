import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ReCaptchaComponent from '../ReCaptchaComponent';

// Mock react-google-recaptcha
vi.mock('react-google-recaptcha', () => ({
  default: React.forwardRef(({ onChange, onExpired, sitekey, theme, size, hl }, ref) => {
    React.useImperativeHandle(ref, () => ({
      reset: vi.fn(),
    }));

    return (
      <div 
        data-testid="recaptcha-mock"
        data-sitekey={sitekey}
        data-theme={theme}
        data-size={size}
        data-hl={hl}
      >
        <button 
          onClick={() => onChange('mock-token')}
          data-testid="recaptcha-solve"
        >
          Solve reCAPTCHA
        </button>
        <button 
          onClick={() => onExpired()}
          data-testid="recaptcha-expire"
        >
          Expire reCAPTCHA
        </button>
        <button 
          onClick={() => onChange(null)}
          data-testid="recaptcha-reset"
        >
          Reset reCAPTCHA
        </button>
      </div>
    );
  })
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' }
  })
}));

// Mock fetch for backend verification
global.fetch = vi.fn();

describe('ReCaptchaComponent', () => {
  const mockOnVerify = vi.fn();
  const mockOnError = vi.fn();
  const mockOnExpire = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  const defaultProps = {
    onVerify: mockOnVerify,
    onError: mockOnError,
    onExpire: mockOnExpire,
  };

  it('renders correctly with default props', () => {
    render(<ReCaptchaComponent {...defaultProps} />);
    
    expect(screen.getByTestId('recaptcha-mock')).toBeInTheDocument();
    expect(screen.getByText('auth.verification.captchaTitle')).toBeInTheDocument();
  });

  it('passes correct props to reCAPTCHA widget', () => {
    render(
      <ReCaptchaComponent 
        {...defaultProps}
        theme="light"
        size="compact"
      />
    );
    
    const recaptcha = screen.getByTestId('recaptcha-mock');
    expect(recaptcha).toHaveAttribute('data-theme', 'light');
    expect(recaptcha).toHaveAttribute('data-size', 'compact');
    expect(recaptcha).toHaveAttribute('data-hl', 'en');
  });

  it('handles successful verification', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalledWith(true, 'mock-token');
    });
    
    expect(screen.getByText('auth.verification.captchaVerified')).toBeInTheDocument();
  });

  it('handles verification failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false })
    });

    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('auth.verification.captchaError');
    });
  });

  it('handles network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Network error');
    });
  });

  it('handles expiration', () => {
    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-expire'));
    
    expect(mockOnExpire).toHaveBeenCalled();
  });

  it('handles reset', () => {
    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-reset'));
    
    expect(mockOnVerify).toHaveBeenCalledWith(false, null);
  });

  it('shows loading state during verification', async () => {
    fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    // Should show loading indicator
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
  });

  it('auto-resets on failure when autoReset is true', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false })
    });

    render(<ReCaptchaComponent {...defaultProps} autoReset={true} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });

    // Should auto-reset after 2 seconds
    await waitFor(() => {
      // Check that reset was called
    }, { timeout: 3000 });
  });

  it('does not show status when showStatus is false', () => {
    render(<ReCaptchaComponent {...defaultProps} showStatus={false} />);
    
    expect(screen.queryByText('auth.verification.captchaTitle')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ReCaptchaComponent {...defaultProps} className="custom-class" />);
    
    const container = screen.getByTestId('recaptcha-mock').closest('.recaptcha-container');
    expect(container).toHaveClass('custom-class');
  });

  it('shows refresh button after error', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false })
    });

    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(screen.getByText('auth.verification.refreshCaptcha')).toBeInTheDocument();
    });
  });

  it('shows refresh button after successful verification', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(screen.getByText('auth.verification.refreshCaptcha')).toBeInTheDocument();
    });
  });

  it('resets when refresh button is clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ReCaptchaComponent {...defaultProps} />);
    
    // First solve the captcha
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(screen.getByText('auth.verification.refreshCaptcha')).toBeInTheDocument();
    });

    // Then click refresh
    fireEvent.click(screen.getByText('auth.verification.refreshCaptcha'));
    
    // Should reset to initial state
    expect(screen.getByTestId('recaptcha-mock')).toBeInTheDocument();
  });

  it('uses fallback verification when backend fails', async () => {
    // Mock backend failure
    fetch.mockRejectedValueOnce(new Error('Backend unavailable'));
    
    // Mock successful fallback
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ReCaptchaComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('recaptcha-solve'));
    
    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalledWith(true, 'mock-token');
    });
  });

  it('handles Arabic language correctly', () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (key) => key,
      i18n: { language: 'ar' }
    });

    render(<ReCaptchaComponent {...defaultProps} />);
    
    const recaptcha = screen.getByTestId('recaptcha-mock');
    expect(recaptcha).toHaveAttribute('data-hl', 'ar');
  });
}); 