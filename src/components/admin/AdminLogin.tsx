import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { FirebaseUser } from '../../types'

interface Props {
  onSuccess: (user: FirebaseUser) => void
}

export default function AdminLogin({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const user = await login(email, password)
      onSuccess(user)
      navigate('/admin')
    } catch {
      /* error shown by useAuth */
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Luxury Pattern Background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#C59B4B 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="bg-white rounded-3xl border border-[#EADBCE] p-8 sm:p-10 shadow-xl">
          
          {/* Brand Monogram */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C59B4B] to-[#8D6527] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <span className="font-serif text-3xl font-bold leading-none mt-1" style={{ fontFamily: 'Amiri, serif' }}>هـ</span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-[#221811] m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
              متجر الهدى للتطريز
            </h2>
            <span className="text-xs text-[#8D6527] font-semibold tracking-wider">
              بوابة تسجيل دخول الإدارة
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                البريد الإلكتروني للإدارة
              </label>
              <div className="flex items-center gap-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-3 focus-within:border-[#8D6527] focus-within:bg-white transition-all">
                <Mail className="w-4 h-4 text-[#8D6527] shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  dir="ltr"
                  className="border-0 outline-none text-xs text-[#221811] bg-transparent flex-1 text-left placeholder-[#968B7E]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                كلمة المرور
              </label>
              <div className="flex items-center gap-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-3 focus-within:border-[#8D6527] focus-within:bg-white transition-all">
                <Lock className="w-4 h-4 text-[#8D6527] shrink-0" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="border-0 outline-none text-xs text-[#221811] bg-transparent flex-1 text-left placeholder-[#968B7E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-[#968B7E] hover:text-[#221811] p-1"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span>جارٍ التحقق والتسجيل...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول آمن للوحة التحكم</span>
                </>
              )}
            </button>
          </form>

          {/* Back to store */}
          <div className="mt-6 pt-4 border-t border-[#EADBCE] text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#8D6527] hover:underline no-underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>العودة لصفحة المتجر الرئيسية</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
