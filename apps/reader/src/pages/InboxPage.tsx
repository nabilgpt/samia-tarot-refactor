import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Input, Textarea } from '@samia-tarot/ui-kit'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

interface Message {
  id: string
  client_name: string
  subject: string
  content: string
  timestamp: string
  is_read: boolean
  type: 'booking_inquiry' | 'session_feedback' | 'general'
}

const InboxPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // TODO: Implement actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000))

        setMessages([
          {
            id: '1',
            client_name: 'سارة أحمد',
            subject: 'استفسار عن جلسة قراءة التاروت',
            content: 'السلام عليكم، أريد حجز جلسة قراءة تاروت شاملة. ما هي الأوقات المتاحة هذا الأسبوع؟',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            is_read: false,
            type: 'booking_inquiry'
          },
          {
            id: '2',
            client_name: 'محمد علي',
            subject: 'شكر على الجلسة الرائعة',
            content: 'شكراً جزيلاً على الجلسة الأمس. كانت مفيدة جداً وساعدتني في فهم الوضع بشكل أفضل. أتطلع لجلسة أخرى قريباً.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            is_read: true,
            type: 'session_feedback'
          },
          {
            id: '3',
            client_name: 'فاطمة خالد',
            subject: 'إلغاء الجلسة المجدولة',
            content: 'أعتذر، أحتاج لإلغاء الجلسة المجدولة غداً بسبب ظرف طارئ. يرجى إعلامي بالإجراءات اللازمة.',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
            is_read: false,
            type: 'general'
          },
          {
            id: '4',
            client_name: 'أحمد محمود',
            subject: 'طلب تأجيل الموعد',
            content: 'هل يمكن تأجيل موعدي من الأربعاء إلى الجمعة؟ نفس الوقت إذا كان متاحاً.',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
            is_read: true,
            type: 'booking_inquiry'
          }
        ])
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [])

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(message =>
      message.id === messageId
        ? { ...message, is_read: true }
        : message
    ))
  }

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message)
    if (!message.is_read) {
      markAsRead(message.id)
    }
  }

  const handleSendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return

    try {
      // TODO: Implement actual API call to send reply
      console.log('Sending reply to:', selectedMessage.client_name, replyContent)

      setReplyContent('')
      setShowReplyForm(false)
      // TODO: Show success message
    } catch (error) {
      console.error('Error sending reply:', error)
      // TODO: Show error message
    }
  }

  const getTypeIcon = (type: Message['type']) => {
    switch (type) {
      case 'booking_inquiry': return '📅'
      case 'session_feedback': return '⭐'
      case 'general': return '💬'
      default: return '✉️'
    }
  }

  const getTypeLabel = (type: Message['type']) => {
    switch (type) {
      case 'booking_inquiry': return 'استفسار حجز'
      case 'session_feedback': return 'تقييم جلسة'
      case 'general': return 'عام'
      default: return 'رسالة'
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
        <title>صندوق الرسائل - قراء سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">صندوق الرسائل</h1>
            <p className="text-gray-600 mt-2">
              رسائل واستفسارات العملاء ({messages.filter(m => !m.is_read).length} غير مقروءة)
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Messages List */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <Card className="h-[600px] overflow-hidden">
                <CardHeader>
                  <CardTitle>الرسائل الواردة</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-full overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📬</div>
                        <p>لا توجد رسائل</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          onClick={() => handleMessageClick(message)}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                          } ${!message.is_read ? 'bg-blue-25 border-l-4 border-blue-500' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <span className="text-lg ml-2">
                                {getTypeIcon(message.type)}
                              </span>
                              <div>
                                <h4 className={`font-medium text-sm ${!message.is_read ? 'font-bold' : ''}`}>
                                  {message.client_name}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  {getTypeLabel(message.type)}
                                </span>
                              </div>
                            </div>
                            {!message.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <h5 className={`text-sm mb-1 ${!message.is_read ? 'font-semibold' : ''}`}>
                            {message.subject}
                          </h5>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {message.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {format(new Date(message.timestamp), 'dd MMM HH:mm', { locale: ar })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Message Detail */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              {selectedMessage ? (
                <Card className="h-[600px] flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span>{getTypeIcon(selectedMessage.type)}</span>
                          {selectedMessage.subject}
                        </CardTitle>
                        <p className="text-gray-600 mt-1">
                          من: {selectedMessage.client_name} • {format(new Date(selectedMessage.timestamp), 'dd MMMM yyyy HH:mm', { locale: ar })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReplyForm(!showReplyForm)}
                      >
                        📧 رد
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 mb-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-800 leading-relaxed">
                          {selectedMessage.content}
                        </p>
                      </div>
                    </div>

                    {/* Reply Form */}
                    {showReplyForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t pt-4"
                      >
                        <h4 className="font-medium mb-3">الرد على {selectedMessage.client_name}</h4>
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="اكتب ردك هنا..."
                          rows={4}
                          className="mb-3"
                        />
                        <div className="flex justify-end space-x-reverse space-x-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowReplyForm(false)}
                          >
                            إلغاء
                          </Button>
                          <Button
                            onClick={handleSendReply}
                            disabled={!replyContent.trim()}
                          >
                            إرسال الرد
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">✉️</div>
                    <h3 className="text-lg font-medium mb-2">اختر رسالة للعرض</h3>
                    <p>حدد رسالة من القائمة لقراءة محتواها والرد عليها</p>
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

export default InboxPage