import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import GlassContainer from '../components/GlassContainer'
import GlowingGlobe from '../components/GlowingGlobe'
import ArkaLogo from '../assets/arka_logo.png'
import { useAuth } from '../context/AuthContext'

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(username, password)
    } catch (err) {
      setError('Invalid email or password')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#020a02] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#071b07] via-[#031003] to-black" />
        <div className="absolute -top-40 -left-20 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -bottom-32 -right-16 h-[420px] w-[420px] rounded-full bg-green-500/10 blur-[120px]" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <GlowingGlobe className="w-[520px] max-w-[85vw] opacity-70" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <GlassContainer className="w-full max-w-md p-8 md:p-10">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="relative w-24 h-24 shrink-0 flex items-center justify-center p-4 rounded-2xl bg-white/10 border border-white/15 shadow-inner backdrop-blur-md overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              whileHover={{ scale: 1.03, rotate: 1 }}
            >
              <motion.div
                className="absolute inset-0 bg-green-500/10 blur-xl rounded-full"
                animate={{ opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.img
                src={ArkaLogo}
                alt="ARKA Logo"
                className="w-full h-full object-contain relative z-10 drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextSibling.style.display = 'flex'
                }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="hidden absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl items-center justify-center text-white font-bold text-2xl shadow-lg">A</div>
            </motion.div>

            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">ARKA</h1>
              <p className="text-[12px] text-green-400 font-bold uppercase tracking-wider">Energy Nexus</p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/60">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30 outline-none backdrop-blur"
                placeholder="admin"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/60">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30 outline-none backdrop-blur"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-full px-4 py-2 text-sm text-red-100 bg-red-500/20 border border-red-400/30 text-center">
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold py-3 shadow-lg shadow-emerald-500/30 transition disabled:opacity-70"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="#"
              className="text-sm text-white/60 hover:text-white transition"
            >
              Forgot password?
            </Link>
          </div>
        </GlassContainer>
      </div>
    </div>
  )
}

export default LoginPage
