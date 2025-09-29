import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'cosmic'
  padding?: 'sm' | 'md' | 'lg' | 'none'
  interactive?: boolean
  children: React.ReactNode
}

const cardVariants = {
  default: 'bg-white border border-gray-200',
  bordered: 'bg-white border-2 border-purple-200',
  elevated: 'bg-white shadow-lg border border-gray-100',
  cosmic: 'bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 text-white border border-purple-500'
}

const paddingVariants = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'default',
    padding = 'md',
    interactive = false,
    children,
    ...props
  }, ref) => {
    const Component = interactive ? motion.div : 'div'
    const motionProps = interactive ? {
      whileHover: { scale: 1.02, y: -2 },
      whileTap: { scale: 0.98 },
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    } : {}

    return (
      <Component
        ref={ref}
        className={cn(
          'rounded-lg transition-colors',
          cardVariants[variant],
          paddingVariants[padding],
          interactive && 'cursor-pointer hover:shadow-md',
          className
        )}
        {...motionProps}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents
export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('mb-4', className)}
    {...props}
  >
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={cn('text-lg font-semibold text-gray-900', className)}
    {...props}
  >
    {children}
  </h3>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('text-gray-600', className)}
    {...props}
  >
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('mt-4 flex items-center justify-between', className)}
    {...props}
  >
    {children}
  </div>
)