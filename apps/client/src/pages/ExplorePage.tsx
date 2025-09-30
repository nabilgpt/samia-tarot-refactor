import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface Reader {
  id: string
  name: string
  avatar: string
  specialties: string[]
  rating: number
  price: number
  isOnline: boolean
  experience: string
}

const ExplorePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Demo readers data
  const readers: Reader[] = [
    {
      id: '1',
      name: 'سامية الخبيرة',
      avatar: '🔮',
      specialties: ['تاروت', 'أبراج', 'قراءة الطالع'],
      rating: 4.9,
      price: 25,
      isOnline: true,
      experience: '15 سنة خبرة'
    },
    {
      id: '2',
      name: 'نورا الروحانية',
      avatar: '🌟',
      specialties: ['تاروت', 'طاقة روحانية'],
      rating: 4.8,
      price: 20,
      isOnline: true,
      experience: '10 سنوات خبرة'
    },
    {
      id: '3',
      name: 'أحمد المتخصص',
      avatar: '✨',
      specialties: ['أبراج', 'فلك'],
      rating: 4.7,
      price: 18,
      isOnline: false,
      experience: '8 سنوات خبرة'
    }
  ]

  const categories = [
    { id: 'all', name: 'الكل', icon: '📋' },
    { id: 'tarot', name: 'تاروت', icon: '🔮' },
    { id: 'astrology', name: 'أبراج', icon: '⭐' },
    { id: 'spiritual', name: 'روحانية', icon: '🌟' }
  ]

  const filteredReaders = readers.filter(reader => {
    const matchesSearch = reader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reader.specialties.some(s => s.includes(searchTerm))
    return matchesSearch
  })

  return (
    <>
      <Helmet>
        <title>استكشاف القراء - سامية تاروت</title>
        <meta name="description" content="تصفح وابحث عن أفضل قراء التاروت والأبراج المتاحين لجلسات القراءة الروحانية" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900">
        {/* Header */}
        <div className="pt-8 pb-6 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-white mb-8"
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                استكشاف القراء
              </h1>
              <p className="text-purple-200 text-lg">
                اختر قارئك المفضل واحجز جلستك الآن
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن قارئ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur rounded-lg px-4 py-3 text-white placeholder-white/60 border border-white/20 focus:border-white/40 focus:outline-none"
                />
                <span className="absolute left-3 top-3 text-white/60">🔍</span>
              </div>
            </motion.div>

            {/* Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-white text-purple-900'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Readers Grid */}
        <div className="px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReaders.map((reader, index) => (
                <motion.div
                  key={reader.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/book/${reader.id}`)}
                >
                  {/* Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      reader.isOnline
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}>
                      {reader.isOnline ? 'متاح الآن' : 'غير متاح'}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <span>⭐</span>
                      <span className="text-white text-sm">{reader.rating}</span>
                    </div>
                  </div>

                  {/* Avatar & Name */}
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">{reader.avatar}</div>
                    <h3 className="text-lg font-semibold text-white">{reader.name}</h3>
                    <p className="text-purple-200 text-sm">{reader.experience}</p>
                  </div>

                  {/* Specialties */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {reader.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="px-2 py-1 bg-purple-600/50 text-white text-xs rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-center">
                    <div className="text-white font-bold">${reader.price}/جلسة</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredReaders.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-white mt-8"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl mb-2">لم يتم العثور على قراء</h3>
                <p className="text-purple-200">جرب البحث بكلمات مختلفة</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ExplorePage