import React, { useState, useEffect } from 'react';
import { MessageCircle, Search, Filter, Eye, Flag, Ban, Check, AlertTriangle, Clock } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminMessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        // Mock data for now
        setMessages([
          {
            id: 1,
            sender: 'أحمد محمد',
            receiver: 'سارة أحمد',
            content: 'مرحباً، أريد حجز جلسة قراءة تاروت لهذا المساء إذا أمكن.',
            type: 'booking_inquiry',
            status: 'active',
            flagged: false,
            timestamp: '2024-01-20 14:30',
            sessionId: 'SES_001',
            priority: 'normal'
          },
          {
            id: 2,
            sender: 'فاطمة علي',
            receiver: 'محمد علي',
            content: 'شكراً لك على الجلسة الرائعة، كانت مفيدة جداً.',
            type: 'feedback',
            status: 'completed',
            flagged: false,
            timestamp: '2024-01-19 16:45',
            sessionId: 'SES_002',
            priority: 'low'
          },
          {
            id: 3,
            sender: 'خالد حسن',
            receiver: 'نور فاطمة',
            content: 'لست راضياً عن الخدمة، أريد استرداد أموالي فوراً!',
            type: 'complaint',
            status: 'flagged',
            flagged: true,
            timestamp: '2024-01-18 10:20',
            sessionId: 'SES_003',
            priority: 'high'
          },
          {
            id: 4,
            sender: 'مريم أحمد',
            receiver: 'سارة أحمد',
            content: 'هل يمكنني تغيير موعد الجلسة إلى الغد؟',
            type: 'reschedule',
            status: 'pending',
            flagged: false,
            timestamp: '2024-01-17 20:15',
            sessionId: 'SES_004',
            priority: 'normal'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageAction = async (messageId, action) => {
    try {
      // TODO: Implement API call
      console.log(`${action} message ${messageId}`);
      setMessages(messages.map(message => 
        message.id === messageId ? { ...message, status: action } : message
      ));
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleFlagMessage = async (messageId, flagged) => {
    try {
      // TODO: Implement API call
      console.log(`${flagged ? 'Flag' : 'Unflag'} message ${messageId}`);
      setMessages(messages.map(message => 
        message.id === messageId ? { ...message, flagged, status: flagged ? 'flagged' : 'active' } : message
      ));
    } catch (error) {
      console.error('Error flagging message:', error);
    }
  };

  const getStatusBadge = (status, flagged) => {
    if (flagged) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          مبلغ عنه
        </span>
      );
    }

    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'نشط' },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'في الانتظار' },
      completed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', text: 'مكتمل' },
      blocked: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'محظور' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      booking_inquiry: { color: 'bg-purple-100 text-purple-800', text: 'استفسار حجز' },
      feedback: { color: 'bg-green-100 text-green-800', text: 'تقييم' },
      complaint: { color: 'bg-red-100 text-red-800', text: 'شكوى' },
      reschedule: { color: 'bg-blue-100 text-blue-800', text: 'إعادة جدولة' },
      general: { color: 'bg-gray-100 text-gray-800', text: 'عام' }
    };
    
    const config = typeConfig[type] || typeConfig.general;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'normal':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Check className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.receiver.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'flagged' && message.flagged) ||
                         (statusFilter !== 'flagged' && message.status === statusFilter);
    const matchesType = typeFilter === 'all' || message.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <MessageCircle className="w-8 h-8 mr-3 text-purple-600" />
              إدارة الرسائل
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              مراقبة وإدارة رسائل المنصة
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في الرسائل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="pending">في الانتظار</option>
                <option value="completed">مكتمل</option>
                <option value="blocked">محظور</option>
                <option value="flagged">مبلغ عنه</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع الأنواع</option>
                <option value="booking_inquiry">استفسار حجز</option>
                <option value="feedback">تقييم</option>
                <option value="complaint">شكوى</option>
                <option value="reschedule">إعادة جدولة</option>
                <option value="general">عام</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <div key={message.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {message.sender} → {message.receiver}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          جلسة: {message.sessionId} • {message.timestamp}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPriorityIcon(message.priority)}
                        {getTypeBadge(message.type)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(message.status, message.flagged)}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                      <Eye className="w-4 h-4 mr-1" />
                      عرض التفاصيل
                    </button>
                    
                    {!message.flagged ? (
                      <button
                        onClick={() => handleFlagMessage(message.id, true)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Flag className="w-4 h-4 mr-1" />
                        إبلاغ
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFlagMessage(message.id, false)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        إلغاء الإبلاغ
                      </button>
                    )}
                    
                    {message.status !== 'blocked' && (
                      <button
                        onClick={() => handleMessageAction(message.id, 'blocked')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        حظر
                      </button>
                    )}
                  </div>

                  {message.flagged && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                          تم الإبلاغ عن هذه الرسالة. يرجى المراجعة بعناية.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد رسائل تطابق المعايير المحددة</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <MessageCircle className="w-8 h-8 text-blue-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الرسائل</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{messages.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">نشطة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {messages.filter(m => m.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">في الانتظار</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {messages.filter(m => m.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Flag className="w-8 h-8 text-red-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مبلغ عنها</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {messages.filter(m => m.flagged).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMessagesPage; 