import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Input, Textarea } from '@samia-tarot/ui-kit'

interface Service {
  id: string
  title: string
  description: string
  duration_minutes: number
  base_price_usd: number
  is_active: boolean
  category: 'tarot' | 'spiritual' | 'astrology' | 'numerology'
}

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const categories = {
    'tarot': 'قراءة التاروت',
    'spiritual': 'الاستشارة الروحانية',
    'astrology': 'علم الفلك',
    'numerology': 'علم الأرقام'
  }

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // TODO: Implement actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000))

        setServices([
          {
            id: '1',
            title: 'قراءة التاروت الشاملة',
            description: 'قراءة كاملة للوضع الحالي والمستقبل القريب باستخدام أوراق التاروت',
            duration_minutes: 45,
            base_price_usd: 75,
            is_active: true,
            category: 'tarot'
          },
          {
            id: '2',
            title: 'استشارة روحانية سريعة',
            description: 'جلسة قصيرة للحصول على إرشاد روحاني حول موضوع محدد',
            duration_minutes: 20,
            base_price_usd: 35,
            is_active: true,
            category: 'spiritual'
          },
          {
            id: '3',
            title: 'تحليل الخريطة الفلكية',
            description: 'تحليل مفصل للخريطة الفلكية الشخصية وتفسير الأبراج',
            duration_minutes: 60,
            base_price_usd: 95,
            is_active: false,
            category: 'astrology'
          }
        ])
      } catch (error) {
        console.error('Error fetching services:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const toggleServiceStatus = (serviceId: string) => {
    setServices(prev => prev.map(service =>
      service.id === serviceId
        ? { ...service, is_active: !service.is_active }
        : service
    ))
  }

  const handleEditService = (service: Service) => {
    setEditingService({ ...service })
  }

  const handleSaveService = () => {
    if (!editingService) return

    setServices(prev => prev.map(service =>
      service.id === editingService.id ? editingService : service
    ))
    setEditingService(null)
  }

  const handleAddService = () => {
    const newService: Service = {
      id: Date.now().toString(),
      title: 'خدمة جديدة',
      description: 'وصف الخدمة',
      duration_minutes: 30,
      base_price_usd: 50,
      is_active: true,
      category: 'tarot'
    }

    setServices(prev => [...prev, newService])
    setEditingService(newService)
    setShowAddForm(false)
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
        <title>خدماتي - قراء سامية تاروت</title>
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
              <h1 className="text-3xl font-bold text-gray-900">خدماتي</h1>
              <p className="text-gray-600 mt-2">
                إدارة وتعديل الخدمات التي تقدمها
              </p>
            </div>

            <Button onClick={() => setShowAddForm(true)}>
              ➕ إضافة خدمة جديدة
            </Button>
          </motion.div>

          {/* Services List */}
          <div className="space-y-6">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`${!service.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-3">
                          {service.title}
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            service.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {service.is_active ? 'نشط' : 'متوقف'}
                          </span>
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>🏷️ {categories[service.category]}</span>
                          <span>⏱️ {service.duration_minutes} دقيقة</span>
                          <span>💰 ${service.base_price_usd}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-reverse space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditService(service)}
                        >
                          ✏️ تعديل
                        </Button>
                        <Button
                          variant={service.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleServiceStatus(service.id)}
                        >
                          {service.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{service.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Edit Service Modal */}
          {editingService && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-xl font-bold mb-6">تعديل الخدمة</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">عنوان الخدمة</label>
                    <Input
                      value={editingService.title}
                      onChange={(e) => setEditingService(prev => prev ? {...prev, title: e.target.value} : null)}
                      placeholder="عنوان الخدمة"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">الوصف</label>
                    <Textarea
                      value={editingService.description}
                      onChange={(e) => setEditingService(prev => prev ? {...prev, description: e.target.value} : null)}
                      placeholder="وصف الخدمة"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">الفئة</label>
                      <select
                        value={editingService.category}
                        onChange={(e) => setEditingService(prev => prev ? {...prev, category: e.target.value as Service['category']} : null)}
                        className="w-full p-2 border rounded-md"
                      >
                        {Object.entries(categories).map(([key, value]) => (
                          <option key={key} value={key}>{value}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">المدة (دقيقة)</label>
                      <Input
                        type="number"
                        value={editingService.duration_minutes}
                        onChange={(e) => setEditingService(prev => prev ? {...prev, duration_minutes: parseInt(e.target.value) || 0} : null)}
                        min="15"
                        max="120"
                        step="15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">السعر ($)</label>
                      <Input
                        type="number"
                        value={editingService.base_price_usd}
                        onChange={(e) => setEditingService(prev => prev ? {...prev, base_price_usd: parseFloat(e.target.value) || 0} : null)}
                        min="10"
                        step="5"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-reverse space-x-3 mt-8">
                  <Button variant="outline" onClick={() => setEditingService(null)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleSaveService}>
                    حفظ التغييرات
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Add Service Confirmation */}
          {showAddForm && (
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
                <h3 className="text-xl font-bold mb-4">إضافة خدمة جديدة</h3>
                <p className="text-gray-600 mb-6">
                  سيتم إنشاء خدمة جديدة بالقيم الافتراضية ويمكنك تعديلها فوراً
                </p>

                <div className="flex justify-end space-x-reverse space-x-3">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleAddService}>
                    إضافة خدمة
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}

export default ServicesPage