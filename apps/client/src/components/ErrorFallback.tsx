import React from 'react'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur rounded-lg p-8 max-w-md w-full text-center text-white">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4">حدث خطأ غير متوقع</h2>
        <p className="text-white/80 mb-6">
          نعتذر، حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى.
        </p>
        <details className="mb-6 text-left">
          <summary className="cursor-pointer text-sm mb-2">تفاصيل الخطأ</summary>
          <pre className="text-xs bg-black/20 p-2 rounded overflow-auto max-h-32">
            {error.message}
          </pre>
        </details>
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}

export default ErrorFallback