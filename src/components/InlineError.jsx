const InlineError = ({ error, onRetry = null, correlationId = null }) => {
  const getErrorMessage = () => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'An unexpected error occurred. Please try again.';
  };

  const getErrorCode = () => {
    if (error?.code) return error.code;
    return null;
  };

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-300">
            {getErrorMessage()}
          </p>

          {getErrorCode() && (
            <p className="text-xs text-red-400/70 mt-1 font-mono">
              Code: {getErrorCode()}
            </p>
          )}

          {correlationId && (
            <p className="text-xs text-red-400/50 mt-1 font-mono">
              ID: {correlationId}
            </p>
          )}

          {error?.details && typeof error.details === 'object' && (
            <details className="mt-2">
              <summary className="text-xs text-red-400/70 cursor-pointer hover:text-red-300">
                Details
              </summary>
              <pre className="text-xs text-red-400/60 mt-1 overflow-auto max-h-32">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 px-3 py-1 text-xs font-medium text-red-300 hover:text-red-200 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default InlineError;