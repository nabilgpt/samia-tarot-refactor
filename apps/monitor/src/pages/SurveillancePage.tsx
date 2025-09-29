import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@samia-tarot/ui-kit'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

interface SessionMonitor {
  id: string
  reader_name: string
  client_name: string
  service_title: string
  start_time: string
  duration_minutes: number
  status: 'ongoing' | 'completed' | 'flagged'
  quality_score: number
  flags: string[]
  room_url: string
}

interface Alert {
  id: string
  type: 'quality' | 'security' | 'policy' | 'technical'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  session_id?: string
  timestamp: string
  is_resolved: boolean
}

const SurveillancePage: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<SessionMonitor[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Implement real-time API connections
        await new Promise(resolve => setTimeout(resolve, 1000))

        setActiveSessions([
          {
            id: '1',
            reader_name: 'سامية الخبيرة',
            client_name: 'سارة أحمد',
            service_title: 'قراءة التاروت الشاملة',
            start_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            duration_minutes: 45,
            status: 'ongoing',
            quality_score: 8.5,
            flags: [],
            room_url: 'https://meet.samia-tarot.com/room/abc123'
          },
          {
            id: '2',
            reader_name: 'أحمد الروحاني',
            client_name: 'محمد علي',
            service_title: 'استشارة روحانية',
            start_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            duration_minutes: 30,
            status: 'flagged',
            quality_score: 6.2,
            flags: ['غير مهني', 'محتوى مشكوك فيه'],
            room_url: 'https://meet.samia-tarot.com/room/xyz789'
          }
        ])

        setRecentAlerts([
          {
            id: '1',
            type: 'quality',
            severity: 'high',
            message: 'تم الإبلاغ عن محتوى غير لائق في الجلسة #2',
            session_id: '2',
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            is_resolved: false
          },
          {
            id: '2',
            type: 'security',
            severity: 'medium',
            message: 'محاولة دخول غير مصرح بها من IP مشبوه',
            timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            is_resolved: true
          },
          {
            id: '3',
            type: 'policy',
            severity: 'low',
            message: 'قارئ يتجاوز الحد الزمني المسموح للجلسة',
            session_id: '1',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            is_resolved: false
          }
        ])
      } catch (error) {
        console.error('Error fetching surveillance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up real-time updates
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: SessionMonitor['status']) => {
    switch (status) {
      case 'ongoing': return 'text-green-600 bg-green-50'
      case 'completed': return 'text-gray-600 bg-gray-50'
      case 'flagged': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'quality': return '⚠️'
      case 'security': return '🔒'
      case 'policy': return '📋'
      case 'technical': return '⚙️'
      default: return '🚨'
    }
  }

  const handleJoinSession = (sessionId: string, roomUrl: string) => {
    window.open(roomUrl, '_blank')
  }

  const resolveAlert = (alertId: string) => {
    setRecentAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, is_resolved: true } : alert
    ))
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
        <title>المراقبة المباشرة - مراقب سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">المراقبة المباشرة</h1>
              <p className="text-gray-600 mt-2">
                مراقبة الجلسات النشطة والتنبيهات الأمنية
              </p>
            </div>

            <div className="flex items-center space-x-reverse space-x-4">
              <div className="text-sm">
                <span className="text-gray-600">آخر تحديث: </span>
                <span className="font-medium">{format(new Date(), 'HH:mm:ss')}</span>
              </div>
              <div className={`w-3 h-3 rounded-full ${activeSessions.length > 0 ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`}></div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">🎥</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-green-600">
                        {activeSessions.length}
                      </div>
                      <div className="text-sm text-gray-600">جلسات نشطة</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">🚨</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-red-600">
                        {recentAlerts.filter(a => !a.is_resolved).length}
                      </div>
                      <div className="text-sm text-gray-600">تنبيهات معلقة</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">⭐</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {(activeSessions.reduce((sum, s) => sum + s.quality_score, 0) / activeSessions.length || 0).toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">متوسط الجودة</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">🚩</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {activeSessions.filter(s => s.status === 'flagged').length}
                      </div>
                      <div className="text-sm text-gray-600">جلسات مُعلَّمة</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Sessions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>الجلسات النشطة</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl block mb-2">😴</span>
                      لا توجد جلسات نشطة حالياً
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">{session.service_title}</h4>
                              <p className="text-sm text-gray-600">
                                {session.reader_name} ← {session.client_name}
                              </p>
                              <div className="flex items-center mt-2 space-x-reverse space-x-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
                                  {session.status === 'ongoing' ? 'جارية' :
                                   session.status === 'flagged' ? 'مُعلَّمة' : 'مكتملة'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ⏱️ {Math.floor((Date.now() - new Date(session.start_time).getTime()) / 60000)} دقيقة
                                </span>
                                <span className="text-xs text-yellow-600">
                                  ⭐ {session.quality_score}/10
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleJoinSession(session.id, session.room_url)}
                            >
                              👁️ مراقبة
                            </Button>
                          </div>

                          {session.flags.length > 0 && (
                            <div className="mt-3 p-2 bg-red-50 rounded-md">
                              <div className="text-sm font-medium text-red-800 mb-1">تنبيهات:</div>
                              <div className="flex flex-wrap gap-1">
                                {session.flags.map((flag, index) => (
                                  <span key={index} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Alerts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>التنبيهات الأخيرة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)} ${
                          alert.is_resolved ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start">
                            <span className="text-lg ml-2">{getAlertIcon(alert.type)}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{alert.message}</p>
                              <div className="flex items-center mt-1 text-xs text-gray-500">
                                <span className="capitalize ml-2">{alert.severity}</span>
                                <span>{format(new Date(alert.timestamp), 'HH:mm')}</span>
                                {alert.session_id && (
                                  <span className="ml-2">• جلسة #{alert.session_id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {!alert.is_resolved && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              ✓
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full mt-4">
                    عرض جميع التنبيهات
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SurveillancePage