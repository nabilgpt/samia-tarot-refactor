import React from 'react'
import { cn } from '../utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  helperText?: string
  fullWidth?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    label,
    error,
    icon,
    helperText,
    fullWidth = true,
    ...props
  }, ref) => {
    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 mr-1 rtl:mr-0 rtl:ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3">
              {icon}
            </div>
          )}

          <input
            type={type}
            ref={ref}
            className={cn(
              'block w-full rounded-lg border-gray-300 shadow-sm',
              'focus:border-purple-500 focus:ring-purple-500',
              'placeholder-gray-400',
              'transition-colors duration-200',
              'disabled:bg-gray-50 disabled:text-gray-500',
              icon && 'pl-10 rtl:pl-3 rtl:pr-10',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              className
            )}
            dir={type === 'tel' || type === 'email' ? 'ltr' : 'auto'}
            {...props}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'