import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppLayout from './layout/AppLayout.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Services from './pages/Services.jsx'
import Horoscopes from './pages/Horoscopes.jsx'

export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<Services />} />
          <Route path="/horoscopes" element={<Horoscopes />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  )
}