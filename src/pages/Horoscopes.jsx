import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const zodiacSigns = [
  { name: 'Aries', emoji: '♈', dates: 'Mar 21 - Apr 19' },
  { name: 'Taurus', emoji: '♉', dates: 'Apr 20 - May 20' },
  { name: 'Gemini', emoji: '♊', dates: 'May 21 - Jun 20' },
  { name: 'Cancer', emoji: '♋', dates: 'Jun 21 - Jul 22' },
  { name: 'Leo', emoji: '♌', dates: 'Jul 23 - Aug 22' },
  { name: 'Virgo', emoji: '♍', dates: 'Aug 23 - Sep 22' },
  { name: 'Libra', emoji: '♎', dates: 'Sep 23 - Oct 22' },
  { name: 'Scorpio', emoji: '♏', dates: 'Oct 23 - Nov 21' },
  { name: 'Sagittarius', emoji: '♐', dates: 'Nov 22 - Dec 21' },
  { name: 'Capricorn', emoji: '♑', dates: 'Dec 22 - Jan 19' },
  { name: 'Aquarius', emoji: '♒', dates: 'Jan 20 - Feb 18' },
  { name: 'Pisces', emoji: '♓', dates: 'Feb 19 - Mar 20' }
]

export default function Horoscopes() {
  const [horoscopes, setHoroscopes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHoroscopes()
  }, [])

  const fetchHoroscopes = async () => {
    try {
      const { data, error } = await supabase
        .from('horoscopes_public_today')
        .select('*')
        .order('zodiac', { ascending: true })

      if (!error) {
        setHoroscopes(data || [])
      }
    } catch (err) {
      console.error('Error fetching horoscopes:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent mb-4">
          Daily Horoscopes
        </h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Discover what the stars have aligned for you today. Your cosmic guidance awaits.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : horoscopes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {horoscopes.map((horoscope, idx) => {
            const sign = zodiacSigns.find(s => s.name.toLowerCase() === horoscope.zodiac.toLowerCase())
            return (
              <div key={horoscope.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300">
                <div className="text-center mb-4">
                  <span className="text-5xl">{sign?.emoji || '⭐'}</span>
                  <h3 className="text-2xl font-bold mt-2">{horoscope.zodiac}</h3>
                  <p className="text-white/50 text-sm">{sign?.dates}</p>
                </div>
                <p className="text-white/80 leading-relaxed">{horoscope.text}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zodiacSigns.map((sign) => (
            <div key={sign.name} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 opacity-50">
              <div className="text-center mb-4">
                <span className="text-5xl">{sign.emoji}</span>
                <h3 className="text-2xl font-bold mt-2">{sign.name}</h3>
                <p className="text-white/50 text-sm">{sign.dates}</p>
              </div>
              <p className="text-white/60 text-center italic">Coming soon...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}