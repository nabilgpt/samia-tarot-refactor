import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('horoscopes_public_today')
        .select('id,zodiac,text,ref_date')
        .order('zodiac', { ascending: true })
        .limit(12)

      if (active) {
        if (!error) setItems(data ?? [])
        setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const six = items.slice(0, 6)

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="text-center py-10">
        <h1 className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
          Unlock Your Cosmic Destiny
        </h1>
        <p className="mt-4 text-white/80 max-w-3xl mx-auto">
          Discover ancient wisdom with modern clarity. Connect with certified readers for personalized guidance.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a href="/checkout?service=tarot_basic" className="rounded-2xl px-5 py-3 bg-purple-600 hover:bg-purple-500">Get Your Reading</a>
          <a href="/horoscopes" className="underline">Daily Horoscopes</a>
        </div>
      </header>

      <aside className="hidden lg:block fixed right-6 top-40 space-y-6 text-sm text-white/85">
        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">Private Audio</div>
        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">Secure Payments</div>
        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">Only 18+</div>
      </aside>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Today's Cosmic Guidance</h2>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : six.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {six.map(h => (
              <article key={h.id} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:translate-y-[-4px] transition">
                <h3 className="font-semibold mb-2">{h.zodiac}</h3>
                <p className="text-sm text-white/80 line-clamp-3">{h.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-white/75">Today's horoscopes are preparing. Come back soon or explore services below.</div>
        )}
      </section>
    </div>
  )
}