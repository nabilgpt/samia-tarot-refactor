import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('base_price', { ascending: true })

      if (!error) {
        setServices(data || [])
      }
    } catch (err) {
      console.error('Error fetching services:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent mb-4">
          Our Services
        </h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Choose from our range of mystical readings and spiritual guidance. Each session is personalized to your unique journey.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div key={service.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:translate-y-[-4px]">
              <h3 className="text-2xl font-bold mb-2">{service.name}</h3>
              <p className="text-white/70 mb-4">{service.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ${service.base_price}
                </span>
                <Link
                  to={`/checkout?service=${service.code}`}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-white/70 text-lg">No services available at the moment. Please check back soon!</p>
        </div>
      )}
    </div>
  )
}