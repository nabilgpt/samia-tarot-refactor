import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Input } from '@samia-tarot/ui-kit'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

interface EarningsData {
  totalEarnings: number
  availableBalance: number
  pendingPayouts: number
  thisMonthEarnings: number
  completedSessions: number
  averageRating: number
}

interface Transaction {
  id: string
  type: 'session_earning' | 'payout_request' | 'payout_completed'
  amount_usd: number
  client_name?: string
  session_title?: string
  timestamp: string
  status: 'completed' | 'pending' | 'processing'
}

interface PayoutAccount {
  id: string
  type: 'bank_transfer' | 'paypal' | 'wise'
  account_details: string
  is_verified: boolean
}

const EarningsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Implement actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000))

        setEarnings({
          totalEarnings: 2450.75,
          availableBalance: 850.25,
          pendingPayouts: 450.50,
          thisMonthEarnings: 1250.00,
          completedSessions: 85,
          averageRating: 4.8
        })

        setTransactions([
          {
            id: '1',
            type: 'session_earning',
            amount_usd: 75,
            client_name: 'سارة أحمد',
            session_title: 'قراءة التاروت الشاملة',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          },
          {
            id: '2',
            type: 'payout_request',
            amount_usd: -300,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'processing'
          },
          {
            id: '3',
            type: 'session_earning',
            amount_usd: 35,
            client_name: 'محمد علي',
            session_title: 'استشارة روحانية سريعة',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          },
          {
            id: '4',
            type: 'payout_completed',
            amount_usd: -500,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          }
        ])

        setPayoutAccounts([
          {
            id: '1',
            type: 'bank_transfer',
            account_details: 'البنك الأهلي - ****1234',
            is_verified: true
          }
        ])
      } catch (error) {
        console.error('Error fetching earnings data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePayoutRequest = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) return

    try {
      // TODO: Implement actual API call
      console.log('Requesting payout:', payoutAmount)

      // Add new payout request to transactions
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type: 'payout_request',
        amount_usd: -parseFloat(payoutAmount),
        timestamp: new Date().toISOString(),
        status: 'pending'
      }

      setTransactions(prev => [newTransaction, ...prev])
      setPayoutAmount('')
      setShowPayoutModal(false)

      // Update available balance
      if (earnings) {
        setEarnings(prev => prev ? {
          ...prev,
          availableBalance: prev.availableBalance - parseFloat(payoutAmount),
          pendingPayouts: prev.pendingPayouts + parseFloat(payoutAmount)
        } : null)
      }
    } catch (error) {
      console.error('Error requesting payout:', error)
    }
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'session_earning': return '💰'
      case 'payout_request': return '📤'
      case 'payout_completed': return '✅'
      default: return '💵'
    }
  }

  const getTransactionLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'session_earning': return 'أرباح جلسة'
      case 'payout_request': return 'طلب سحب'
      case 'payout_completed': return 'سحب مكتمل'
      default: return 'معاملة'
    }
  }

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'processing': return 'text-yellow-600 bg-yellow-50'
      case 'pending': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return 'مكتملة'
      case 'processing': return 'قيد المعالجة'
      case 'pending': return 'معلقة'
      default: return 'غير محدد'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>الأرباح - قراء سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">الأرباح</h1>
              <p className="text-gray-600 mt-2">
                متابعة أرباحك وطلبات السحب
              </p>
            </div>

            <Button onClick={() => setShowPayoutModal(true)} disabled={!earnings || earnings.availableBalance < 50}>
              💳 طلب سحب
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    الرصيد المتاح
                  </CardTitle>
                  <span className="text-2xl">💰</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${earnings?.availableBalance.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    جاهز للسحب
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    الإجمالي
                  </CardTitle>
                  <span className="text-2xl">📊</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${earnings?.totalEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    إجمالي الأرباح
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    هذا الشهر
                  </CardTitle>
                  <span className="text-2xl">📅</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    ${earnings?.thisMonthEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {earnings?.completedSessions} جلسة
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    معلق للسحب
                  </CardTitle>
                  <span className="text-2xl">⏳</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${earnings?.pendingPayouts.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    قيد المراجعة
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>المعاملات الأخيرة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-2xl ml-3">
                            {getTransactionIcon(transaction.type)}
                          </span>
                          <div>
                            <h4 className="font-medium text-sm">
                              {getTransactionLabel(transaction.type)}
                            </h4>
                            {transaction.client_name && (
                              <p className="text-xs text-gray-600">
                                {transaction.client_name} • {transaction.session_title}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {format(new Date(transaction.timestamp), 'dd MMM HH:mm', { locale: ar })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            transaction.amount_usd > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount_usd > 0 ? '+' : ''}${Math.abs(transaction.amount_usd).toFixed(2)}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                            {getStatusText(transaction.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full mt-4">
                    عرض جميع المعاملات
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Payout Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات السحب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">ملاحظات مهمة</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• الحد الأدنى للسحب: $50</li>
                        <li>• معالجة الطلبات: 3-5 أيام عمل</li>
                        <li>• رسوم المعاملة: حسب طريقة الدفع</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">حسابات السحب</h4>
                      {payoutAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center">
                            <span className="text-xl ml-3">
                              {account.type === 'bank_transfer' ? '🏦' : account.type === 'paypal' ? '💙' : '💳'}
                            </span>
                            <div>
                              <p className="font-medium text-sm">{account.account_details}</p>
                              <div className="flex items-center mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  account.is_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {account.is_verified ? '✓ موثق' : '✗ غير موثق'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            ⚙️
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full mt-3">
                        ➕ إضافة حساب جديد
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Payout Request Modal */}
        {showPayoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-6">طلب سحب أرباح</h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  الرصيد المتاح: <span className="font-bold text-green-600">${earnings?.availableBalance.toFixed(2)}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">المبلغ المطلوب ($)</label>
                <Input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="50.00"
                  min="50"
                  max={earnings?.availableBalance || 0}
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  الحد الأدنى: $50 | الحد الأقصى: ${earnings?.availableBalance.toFixed(2)}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">حساب الاستلام</label>
                <select className="w-full p-2 border rounded-md">
                  {payoutAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_details}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-reverse space-x-3">
                <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handlePayoutRequest}
                  disabled={!payoutAmount || parseFloat(payoutAmount) < 50 || parseFloat(payoutAmount) > (earnings?.availableBalance || 0)}
                >
                  تأكيد الطلب
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </>
  )
}

export default EarningsPage