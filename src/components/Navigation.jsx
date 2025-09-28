import { Link, NavLink } from 'react-router-dom'

export default function Navigation() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-black/40 border-b border-white/10">
      <div className="max-w-screen-xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="font-bold tracking-wide">SAMIA TAROT</Link>
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/horoscopes">Horoscopes</NavLink>
        </div>
        <div className="flex items-center gap-4">
          <NavLink to="/login">Login</NavLink>
        </div>
      </div>
    </nav>
  )
}