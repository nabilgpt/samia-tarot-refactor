import React from 'react'
import { Button } from '@samia-tarot/ui-kit'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-6xl text-red-500 mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            حدث خطأ غير متوقع
          </h1>
          <p className="text-gray-600 mb-6">
            نعتذر للإزعاج. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني إذا استمر المشكلة.
          </p>
          <details className="mb-6 p-4 bg-gray-100 rounded-lg text-left" dir="ltr">
            <summary className="cursor-pointer mb-2 font-semibold text-gray-700">
              تفاصيل الخطأ (للدعم الفني)
            </summary>
            <pre className="text-xs text-red-600 whitespace-pre-wrap">
              {error.message}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
          <div className="space-y-3">
            <Button
              onClick={resetErrorBoundary}
              className="w-full"
            >
              إعادة المحاولة
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorFallback