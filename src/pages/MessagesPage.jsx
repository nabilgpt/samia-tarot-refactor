import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  MessageCircle, 
  Search, 
  Star, 
  Clock, 
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';
import Button from '../components/Button';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import EmergencyCallButton from '../components/EmergencyCallButton';

const MessagesPage = () => {
  const { t } = useTranslation();
  const { user, profile, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock conversations data
    setTimeout(() => {
      setConversations([
        {
          id: 1,
          reader: {
            name: 'سامية الأحمد',
            avatar: '/avatars/samia.jpg',
            isOnline: true,
            rating: 4.9
          },
          lastMessage: 'شكراً لك على الجلسة الرائعة!',
          lastMessageTime: '2 دقائق',
          unreadCount: 2,
          messages: [
            {
              id: 1,
              text: 'مرحباً! أرحب بك في جلسة قراءة التاروت',
              sender: 'reader',
              time: '10:30 AM',
              type: 'text'
            },
            {
              id: 2,
              text: 'شكراً، أنا متحمس جداً لهذه الجلسة',
              sender: 'user',
              time: '10:31 AM',
              type: 'text'
            },
            {
              id: 3,
              text: 'ما هو السؤال الذي تريد التركيز عليه اليوم؟',
              sender: 'reader',
              time: '10:32 AM',
              type: 'text'
            }
          ]
        },
        {
          id: 2,
          reader: {
            name: 'فاطمة العلي',
            avatar: '/avatars/fatima.jpg',
            isOnline: false,
            rating: 4.8
          },
          lastMessage: 'سأكون متاحة غداً في الصباح',
          lastMessageTime: '2 ساعات',
          unreadCount: 0,
          messages: []
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (!isAuthenticated) {
    return (
      <AnimatedBackground variant="default" intensity="normal">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 shadow-2xl shadow-cosmic-500/10">
            <h2 className="text-2xl font-bold text-white mb-4">تسجيل الدخول مطلوب</h2>
            <p className="text-gray-400 mb-6">يجب تسجيل الدخول لعرض الرسائل</p>
            <Button href="/login" className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold">
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;

    const newMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      time: new Date().toLocaleTimeString('ar', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: 'text'
    };

    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedChat.id 
          ? { ...conv, messages: [...conv.messages, newMessage] }
          : conv
      )
    );

    setMessage('');
  };

  if (loading) {
    return (
      <AnimatedBackground variant="default" intensity="normal">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold-400"></div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground variant="default" intensity="normal">
      {/* Emergency Call Button */}
      <EmergencyCallButton />
      
      <div className="h-screen flex">
        {/* Conversations Sidebar */}
        <div className="w-1/3 border-r border-gold-400/20 bg-dark-800/50 backdrop-blur-xl">
          {/* Header */}
          <div className="p-4 border-b border-gold-400/20">
            <h1 className="text-xl font-bold text-white mb-4">الرسائل</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في المحادثات..."
                className="w-full pl-10 pr-4 py-2 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="overflow-y-auto h-full">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedChat(conversation)}
                className={`p-4 border-b border-gold-400/20 cursor-pointer hover:bg-dark-700/50 transition-colors ${
                  selectedChat?.id === conversation.id ? 'bg-dark-700/50' : ''
                }`}
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center shadow-lg shadow-gold-500/30">
                      <span className="text-dark-900 font-bold">
                        {conversation.reader.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    {conversation.reader.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-dark-900"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-white">{conversation.reader.name}</h3>
                      <span className="text-xs text-gray-400">{conversation.lastMessageTime}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400 truncate">{conversation.lastMessage}</p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-gold-500 text-dark-900 text-xs rounded-full px-2 py-1 font-bold">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center mt-1">
                      <Star className="w-3 h-3 text-gold-400 fill-current mr-1" />
                      <span className="text-xs text-gold-400">{conversation.reader.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-dark-800/30 backdrop-blur-xl">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gold-400/20 bg-dark-800/50 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center shadow-lg shadow-gold-500/30">
                        <span className="text-dark-900 font-bold">
                          {selectedChat.reader.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      {selectedChat.reader.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-dark-900"></div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-medium text-white">{selectedChat.reader.name}</h3>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-gold-400 fill-current mr-1" />
                        <span className="text-xs text-gold-400 mr-2">{selectedChat.reader.rating}</span>
                        <span className={`text-xs ${selectedChat.reader.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                          {selectedChat.reader.isOnline ? 'متصل الآن' : 'غير متصل'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gold-400 hover:text-gold-300 hover:bg-gold-400/10 rounded-lg transition-all duration-200">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gold-400 hover:text-gold-300 hover:bg-gold-400/10 rounded-lg transition-all duration-200">
                      <Video className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gold-400 hover:text-gold-300 hover:bg-gold-400/10 rounded-lg transition-all duration-200">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900'
                          : 'bg-dark-700/50 border border-gold-400/20 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-dark-700' : 'text-gray-400'
                      }`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gold-400/20 bg-dark-800/50 backdrop-blur-xl">
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gold-400 hover:text-gold-300 hover:bg-gold-400/10 rounded-lg transition-all duration-200">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 px-4 py-2 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="p-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-gold-500/30"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gold-400/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">اختر محادثة</h3>
                <p className="text-gray-400">اختر محادثة من القائمة لبدء المراسلة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default MessagesPage; 