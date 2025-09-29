import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@samia-tarot/ui-kit'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

interface Session {
  id: string
  client_name: string
  service_title: string
  start_time: string
  end_time: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  earnings_usd: number
  rating?: number
  has_review: boolean
  meeting_link?: string
}

const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // TODO: Implement actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000))

        setSessions([
          {
            id: '1',
            client_name: 'سارة أحمد',
            service_title: 'قراءة التاروت الشاملة',
            start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
            end_time: new Date(Date.now() + 2.75 * 60 * 60 * 1000).toISOString(),
            status: 'upcoming',
            earnings_usd: 75,
            has_review: false,
            meeting_link: 'https://meet.samia-tarot.com/room/abc123'
          },
          {
            id: '2',
            client_name: 'محمد علي',
            service_title: 'استشارة روحانية سريعة',
            start_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
            end_time: new Date(Date.now() - 2.67 * 60 * 60 * 1000).toISOString(),
            status: 'completed',
            earnings_usd: 35,
            rating: 5,
            has_review: true
          },
          {
            id: '3',
            client_name: 'فاطمة خالد',
            service_title: 'قراءة التاروت الشاملة',
            start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            end_time: new Date(Date.now() - 23.25 * 60 * 60 * 1000).toISOString(),
            status: 'completed',
            earnings_usd: 75,
            rating: 4,
            has_review: false
          }
        ])
      } catch (error) {
        console.error('Error fetching sessions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-50'
      case 'ongoing': return 'text-green-600 bg-green-50'
      case 'completed': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: Session['status']) => {
    switch (status) {
      case 'upcoming': return 'قادمة'
      case 'ongoing': return 'جارية'
      case 'completed': return 'مكتملة'
      case 'cancelled': return 'ملغاة'
      default: return 'غير محدد'
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return session.status === 'upcoming' || session.status === 'ongoing'
    if (filter === 'completed') return session.status === 'completed'
    return true
  })

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
        <title>الجلسات - قراء سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">الجلسات</h1>
              <p className="text-gray-600 mt-2">
                متابعة جلساتك السابقة والقادمة
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                الكل
              </Button>
              <Button
                variant={filter === 'upcoming' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('upcoming')}
              >
                القادمة
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                المكتملة
              </Button>
            </div>
          </motion.div>

          {/* Sessions List */}
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  لا توجد جلسات
                </h3>
                <p className="text-gray-600">
                  {filter === 'upcoming' ? 'لا توجد جلسات قادمة' :
                   filter === 'completed' ? 'لا توجد جلسات مكتملة' :
                   'لا توجد جلسات بعد'}
                </p>
              </motion.div>
            ) : (
              filteredSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-3">
                            {session.service_title}
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
                              {getStatusText(session.status)}
                            </span>
                          </CardTitle>
                          <p className="text-gray-600 mt-1">
                            مع {session.client_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ${session.earnings_usd}
                          </div>
                          {session.rating && (
                            <div className="flex items-center justify-end mt-1">
                              <span className="text-sm text-yellow-600 ml-1">
                                {'⭐'.repeat(session.rating)}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({session.rating}/5)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-reverse space-x-4 text-sm text-gray-600">
                          <span>
                            📅 {format(new Date(session.start_time), 'dd MMMM yyyy', { locale: ar })}
                          </span>
                          <span>
                            🕐 {format(new Date(session.start_time), 'HH:mm')} - {format(new Date(session.end_time), 'HH:mm')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-reverse space-x-2">
                          {session.status === 'upcoming' && session.meeting_link && (
                            <Button
                              size="sm"
                              onClick={() => window.open(session.meeting_link, '_blank')}
                            >
                              🎥 دخول الجلسة
                            </Button>
                          )}
                          {session.status === 'completed' && !session.has_review && (
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              📝 عرض التقييم
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            ℹ️ التفاصيل
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {/* Summary Stats */}
          {filteredSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle>ملخص</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredSessions.filter(s => s.status === 'upcoming').length}
                      </div>
                      <div className="text-sm text-gray-600">جلسات قادمة</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {filteredSessions.filter(s => s.status === 'completed').length}
                      </div>
                      <div className="text-sm text-gray-600">جلسات مكتملة</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        ${filteredSessions.reduce((total, session) => total + session.earnings_usd, 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">إجمالي الأرباح</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}

export default SessionsPage