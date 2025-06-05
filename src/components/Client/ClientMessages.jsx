import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Send,
  Search,
  Filter,
  MoreHorizontal,
  User,
  Clock,
  Star,
  Eye,
  Paperclip,
  Image,
  Smile,
  Phone,
  Video,
  X,
  Plus
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

const ClientMessages = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockConversations = [
        {
          id: '1',
          reader: {
            id: 'reader1',
            name: 'Samia Al-Mystique',
            name_ar: 'سامية الغامضة',
            avatar_url: null,
            status: 'online'
          },
          last_message: {
            content: 'Thank you for the wonderful session! Your insights were very helpful.',
            content_ar: 'شكراً لك على الجلسة الرائعة! كانت رؤاك مفيدة جداً.',
            timestamp: '2024-01-25T15:30:00Z',
            is_read: true
          },
          unread_count: 0
        },
        {
          id: '2',
          reader: {
            id: 'reader2',
            name: 'Omar Al-Kindi',
            name_ar: 'عمر الكندي',
            avatar_url: null,
            status: 'offline'
          },
          last_message: {
            content: 'Your astrology reading is scheduled for tomorrow at 3 PM. See you then!',
            content_ar: 'قراءة الأبراج الخاصة بك مجدولة غداً في تمام الساعة 3 مساءً. أراك آنذاك!',
            timestamp: '2024-01-25T14:15:00Z',
            is_read: false
          },
          unread_count: 2
        },
        {
          id: '3',
          reader: {
            id: 'reader3',
            name: 'Layla Al-Fares',
            name_ar: 'ليلى الفارس',
            avatar_url: null,
            status: 'busy'
          },
          last_message: {
            content: 'I would love to help you with palm reading. When would you like to schedule?',
            content_ar: 'أود أن أساعدك في قراءة الكف. متى تود أن نحدد موعداً؟',
            timestamp: '2024-01-25T12:00:00Z',
            is_read: true
          },
          unread_count: 0
        }
      ];
      setConversations(mockConversations);
      if (mockConversations.length > 0) {
        setSelectedConversation(mockConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      showError(language === 'ar' ? 'فشل في تحميل المحادثات' : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      // Mock messages for the selected conversation
      const mockMessages = [
        {
          id: '1',
          sender_id: 'reader1',
          sender_type: 'reader',
          content: 'Hello! Thank you for booking a session with me. I\'m excited to help you with your tarot reading.',
          content_ar: 'مرحباً! شكراً لحجز جلسة معي. أنا متحمسة لمساعدتك في قراءة التاروت.',
          timestamp: '2024-01-25T14:00:00Z',
          message_type: 'text'
        },
        {
          id: '2',
          sender_id: 'client1',
          sender_type: 'client',
          content: 'Hi Samia! I\'m really looking forward to it. I have some questions about my career path.',
          content_ar: 'مرحباً سامية! أنا أتطلع إليها حقاً. لدي بعض الأسئلة حول مسيرتي المهنية.',
          timestamp: '2024-01-25T14:05:00Z',
          message_type: 'text'
        },
        {
          id: '3',
          sender_id: 'reader1',
          sender_type: 'reader',
          content: 'Perfect! Career questions are very common in tarot readings. I\'ll prepare some specific spreads for you.',
          content_ar: 'مثالي! أسئلة المهنة شائعة جداً في قراءات التاروت. سأعد لك بعض التوزيعات المحددة.',
          timestamp: '2024-01-25T14:10:00Z',
          message_type: 'text'
        },
        {
          id: '4',
          sender_id: 'client1',
          sender_type: 'client',
          content: 'Thank you for the wonderful session! Your insights were very helpful.',
          content_ar: 'شكراً لك على الجلسة الرائعة! كانت رؤاك مفيدة جداً.',
          timestamp: '2024-01-25T15:30:00Z',
          message_type: 'text'
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      showError(language === 'ar' ? 'فشل في تحميل الرسائل' : 'Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const newMsg = {
        id: Date.now().toString(),
        sender_id: 'client1',
        sender_type: 'client',
        content: newMessage,
        content_ar: newMessage,
        timestamp: new Date().toISOString(),
        message_type: 'text'
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      showSuccess(language === 'ar' ? 'تم إرسال الرسالة' : 'Message sent');
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إرسال الرسالة' : 'Failed to send message');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'busy': return 'bg-yellow-400';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const readerName = language === 'ar' ? conv.reader.name_ar : conv.reader.name;
    const lastMessage = language === 'ar' ? conv.last_message.content_ar : conv.last_message.content;
    return readerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل الرسائل...' : 'Loading messages...'}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-full flex flex-col lg:flex-row gap-6"
    >
      {/* Conversations List */}
      <motion.div
        variants={itemVariants}
        className="w-full lg:w-1/3 glassmorphism rounded-2xl border border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            {language === 'ar' ? 'الرسائل' : 'Messages'}
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'البحث في المحادثات...' : 'Search conversations...'}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => {
            const readerName = language === 'ar' ? conversation.reader.name_ar : conversation.reader.name;
            const lastMessage = language === 'ar' ? conversation.last_message.content_ar : conversation.last_message.content;
            
            return (
              <motion.div
                key={conversation.id}
                whileHover={{ scale: 1.02, x: 5 }}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-white/10 cursor-pointer transition-all duration-300 ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-purple-500/20 border-purple-400/50'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      {conversation.reader.avatar_url ? (
                        <img 
                          src={conversation.reader.avatar_url} 
                          alt="Avatar" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(conversation.reader.status)} rounded-full border-2 border-gray-800`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white truncate">{readerName}</h3>
                      <span className="text-xs text-gray-400">
                        {formatTime(conversation.last_message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate mb-1">{lastMessage}</p>
                    {conversation.unread_count > 0 && (
                      <span className="inline-block bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Chat Area */}
      <motion.div
        variants={itemVariants}
        className="flex-1 glassmorphism rounded-2xl border border-white/10 flex flex-col"
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {selectedConversation.reader.avatar_url ? (
                      <img 
                        src={selectedConversation.reader.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(selectedConversation.reader.status)} rounded-full border-2 border-gray-800`}></div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-white">
                    {language === 'ar' ? selectedConversation.reader.name_ar : selectedConversation.reader.name}
                  </h3>
                  <p className="text-sm text-gray-400 capitalize">{selectedConversation.reader.status}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((message) => {
                const isClient = message.sender_type === 'client';
                const content = language === 'ar' ? message.content_ar : message.content;
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      isClient
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-white/10 text-gray-200'
                    }`}>
                      <p className="text-sm">{content}</p>
                      <p className={`text-xs mt-2 ${isClient ? 'text-purple-100' : 'text-gray-400'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-white/10">
              <div className="flex items-center space-x-3">
                <button className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                  <Image className="w-5 h-5" />
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {language === 'ar' ? 'اختر محادثة' : 'Select a Conversation'}
              </h3>
              <p className="text-gray-500">
                {language === 'ar' ? 'اختر محادثة من القائمة لبدء المراسلة' : 'Choose a conversation from the list to start messaging'}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ClientMessages; 