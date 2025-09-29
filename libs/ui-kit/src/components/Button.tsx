import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const buttonVariants = {
  primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  outline: 'border border-purple-600 text-purple-600 hover:bg-purple-50 focus:ring-purple-500',
  ghost: 'text-purple-600 hover:bg-purple-50 focus:ring-purple-500',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
}

const buttonSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    children,
    disabled,
    ...props
  }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          'rtl:flex-row-reverse',
          buttonVariants[variant],
          buttonSizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin rtl:mr-0 rtl:ml-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            جاري التحميل...
          </>
        ) : (
          <>
            {icon && <span className="mr-2 rtl:mr-0 rtl:ml-2">{icon}</span>}
            {children}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'