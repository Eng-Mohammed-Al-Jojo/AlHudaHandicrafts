import { useState, useCallback } from 'react'
import { signInAdmin } from '../firebase'
import type { FirebaseUser } from '../types'

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError('')
    try {
      const u = await signInAdmin(email, password)
      setUser(u)
      return u
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تسجيل الدخول. تحققي من البريد وكلمة المرور.'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => setUser(null), [])

  return { user, loading, error, login, logout }
}
