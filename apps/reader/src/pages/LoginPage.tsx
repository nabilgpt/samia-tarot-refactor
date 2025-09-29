import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Input, LoadingSpinner } from '@samia-tarot/ui-kit'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const LoginPage: React.FC = () => {
  const { user, signIn, loading: authLoading } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const from = location.state?.from?.pathname || '/'

  if (user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(formData.email, formData.password)
      toast.success('تم تسجيل الدخول بنجاح')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'فشل في تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>تسجيل الدخول - قراء سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-6xl mb-4"
            >
              🔮
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              قراء سامية تاروت
            </h1>
            <p className="text-gray-600">
              تسجيل الدخول لحساب القارئ
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="reader@example.com"
                className="w-full"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !formData.email || !formData.password}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              هل نسيت كلمة المرور؟{' '}
              <a href="#" className="text-green-600 hover:text-green-500 font-medium">
                إعادة تعيين
              </a>
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                للحصول على حساب قارئ، يرجى التواصل مع الإدارة
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default LoginPage