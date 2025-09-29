import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@samia-tarot/ui-kit'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  is_available: boolean
  booking_id?: string
  client_name?: string
}

interface DaySchedule {
  date: Date
  slots: TimeSlot[]
}

const SchedulePage: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 6 })) // Saturday start
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)

  const weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        // TODO: Implement actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000))

        const weekSchedule: DaySchedule[] = []
        for (let i = 0; i < 7; i++) {
          const date = addDays(currentWeek, i)
          const slots: TimeSlot[] = []

          // Generate time slots (9 AM to 9 PM)
          for (let hour = 9; hour <= 21; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`
            const endTime = `${hour === 21 ? '22' : (hour + 1).toString().padStart(2, '0')}:00`

            slots.push({
              id: `${date.toISOString().split('T')[0]}-${startTime}`,
              start_time: startTime,
              end_time: endTime,
              is_available: Math.random() > 0.3, // Random availability
              booking_id: Math.random() > 0.7 ? `booking-${Math.random().toString(36).substr(2, 9)}` : undefined,
              client_name: Math.random() > 0.7 ? ['سارة أحمد', 'محمد علي', 'فاطمة خالد', 'أحمد محمود'][Math.floor(Math.random() * 4)] : undefined
            })
          }

          weekSchedule.push({ date, slots })
        }

        setSchedule(weekSchedule)
      } catch (error) {
        console.error('Error fetching schedule:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [currentWeek])

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7))
  }

  const toggleSlotAvailability = (dayIndex: number, slotIndex: number) => {
    setSchedule(prev => prev.map((day, dIndex) =>
      dIndex === dayIndex
        ? {
            ...day,
            slots: day.slots.map((slot, sIndex) =>
              sIndex === slotIndex
                ? { ...slot, is_available: !slot.is_available }
                : slot
            )
          }
        : day
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
        <title>إدارة المواعيد - قراء سامية تاروت</title>
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
              <h1 className="text-3xl font-bold text-gray-900">إدارة المواعيد</h1>
              <p className="text-gray-600 mt-2">
                تحكم في مواعيدك وأوقات التوفر
              </p>
            </div>

            <div className="flex items-center space-x-reverse space-x-4">
              <Button variant="outline" onClick={() => navigateWeek('prev')}>
                ←
              </Button>
              <span className="text-lg font-medium">
                {format(currentWeek, 'MMMM yyyy', { locale: ar })}
              </span>
              <Button variant="outline" onClick={() => navigateWeek('next')}>
                →
              </Button>
            </div>
          </motion.div>

          {/* Weekly Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {schedule.map((day, dayIndex) => (
              <motion.div
                key={day.date.toISOString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.1 }}
              >
                <Card className={`h-full ${isSameDay(day.date, new Date()) ? 'ring-2 ring-green-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-center">
                      <div className="text-sm text-gray-600">
                        {weekDays[dayIndex]}
                      </div>
                      <div className="text-xl font-bold">
                        {format(day.date, 'd')}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {day.slots.map((slot, slotIndex) => (
                      <div
                        key={slot.id}
                        className={`p-2 rounded-md text-xs cursor-pointer transition-colors ${
                          slot.booking_id
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : slot.is_available
                              ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                        onClick={() => !slot.booking_id && toggleSlotAvailability(dayIndex, slotIndex)}
                      >
                        <div className="font-medium">
                          {slot.start_time}
                        </div>
                        <div className="text-xs mt-1">
                          {slot.booking_id ? (
                            <span>{slot.client_name}</span>
                          ) : slot.is_available ? (
                            <span>متاح</span>
                          ) : (
                            <span>غير متاح</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>إعدادات سريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button>
                    📅 تحديد ساعات العمل الافتراضية
                  </Button>
                  <Button variant="outline">
                    🚫 إغلاق يوم كامل
                  </Button>
                  <Button variant="outline">
                    ⚡ فتح جميع الأوقات المتاحة
                  </Button>
                  <Button variant="outline">
                    📊 إحصائيات الحجوزات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6"
          >
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                    متاح للحجز
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
                    محجوز
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2"></div>
                    غير متاح
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default SchedulePage