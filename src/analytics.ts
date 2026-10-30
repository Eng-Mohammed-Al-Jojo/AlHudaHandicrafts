import { db } from './firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, Timestamp, limit } from 'firebase/firestore'

// ── Types ──────────────────────────────────────────────────────────
export interface PageView {
  id?: string
  path: string
  title: string
  device: 'mobile' | 'desktop' | 'tablet'
  referrer: string
  sessionId: string
  timestamp: Timestamp | null
  createdAt?: string
}

export interface AnalyticsRecord {
  id: string
  path: string
  title: string
  device: 'mobile' | 'desktop' | 'tablet'
  referrer: string
  sessionId: string
  createdAt: string
}

export interface AnalyticsSummary {
  todayViews: number
  todaySessions: number
  weekViews: number
  weekSessions: number
  monthViews: number
  topPages: { path: string; title: string; count: number }[]
  deviceBreakdown: { mobile: number; desktop: number; tablet: number }
  hourlyToday: number[]
  dailyWeek: { date: string; views: number; sessions: number }[]
}

// ── Session ID ────────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  const key = 'alhuda_sid'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem(key, sid)
  }
  return sid
}

// ── Device Detection ──────────────────────────────────────────────
function detectDevice(): 'mobile' | 'desktop' | 'tablet' {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

// ── Page Labels ───────────────────────────────────────────────────
function getPageTitle(path: string): string {
  if (path === '/' || path === '') return 'الرئيسية'
  if (path.startsWith('/products')) return 'المنتجات'
  if (path.startsWith('/categories')) return 'الأقسام'
  if (path.startsWith('/cart')) return 'سلة التسوق'
  if (path.startsWith('/checkout')) return 'الدفع'
  if (path.startsWith('/order')) return 'تفاصيل الطلب'
  if (path.startsWith('/admin')) return null! // Don't track admin pages
  return path
}

// ── Track a Page View ─────────────────────────────────────────────
export async function trackPageView(path: string): Promise<void> {
  // Skip admin pages
  if (path.startsWith('/admin')) return
  // Skip bots
  if (/bot|crawler|spider|scraper/i.test(navigator.userAgent)) return

  const title = getPageTitle(path)
  if (!title) return

  const sessionId = getOrCreateSessionId()
  const device = detectDevice()

  try {
    await addDoc(collection(db, 'analytics_pageviews'), {
      path,
      title,
      device,
      sessionId,
      referrer: document.referrer || 'direct',
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    })
  } catch {
    // Silently fail — analytics should never break the store
  }
}

// ── Load Analytics Summary ────────────────────────────────────────
export async function loadAnalyticsSummary(): Promise<AnalyticsSummary> {
  const now = new Date()

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 6)
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now)
  startOfMonth.setDate(now.getDate() - 29)
  startOfMonth.setHours(0, 0, 0, 0)

  const col = collection(db, 'analytics_pageviews')

  let rows: (PageView & { createdAt: string })[] = []
  try {
    const q = query(
      col,
      where('createdAt', '>=', startOfMonth.toISOString()),
      orderBy('createdAt', 'desc'),
      limit(5000)
    )
    const snap = await getDocs(q)
    rows = snap.docs.map(d => d.data() as PageView & { createdAt: string })
  } catch (err) {
    console.warn('Analytics range query fallback:', err)
    try {
      const fallbackSnap = await getDocs(query(col, limit(1000)))
      rows = fallbackSnap.docs
        .map(d => d.data() as PageView & { createdAt: string })
        .filter(r => r.createdAt && r.createdAt >= startOfMonth.toISOString())
    } catch (e2) {
      console.error('Failed to load analytics:', e2)
      throw e2
    }
  }

  // ── Today ────────────────────────────────────────────────────────
  const todayRows = rows.filter(r => r.createdAt >= startOfToday.toISOString())
  const todayViews = todayRows.length
  const todaySessions = new Set(todayRows.map(r => r.sessionId)).size

  // ── Week ─────────────────────────────────────────────────────────
  const weekRows = rows.filter(r => r.createdAt >= startOfWeek.toISOString())
  const weekViews = weekRows.length
  const weekSessions = new Set(weekRows.map(r => r.sessionId)).size

  // ── Month ─────────────────────────────────────────────────────────
  const monthViews = rows.length

  // ── Top Pages ────────────────────────────────────────────────────
  const pageCounts: Record<string, { title: string; count: number }> = {}
  rows.forEach(r => {
    const key = r.path
    if (!pageCounts[key]) pageCounts[key] = { title: r.title, count: 0 }
    pageCounts[key].count++
  })
  const topPages = Object.entries(pageCounts)
    .map(([path, { title, count }]) => ({ path, title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // ── Device Breakdown ──────────────────────────────────────────────
  const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 }
  rows.forEach(r => {
    if (r.device in deviceBreakdown) deviceBreakdown[r.device]++
  })

  // ── Hourly Today (0-23) ───────────────────────────────────────────
  const hourlyToday = Array(24).fill(0)
  todayRows.forEach(r => {
    const h = new Date(r.createdAt).getHours()
    hourlyToday[h]++
  })

  // ── Daily Last 7 days ─────────────────────────────────────────────
  const dailyMap: Record<string, { views: number; sessions: Set<string> }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyMap[key] = { views: 0, sessions: new Set() }
  }
  weekRows.forEach(r => {
    const key = r.createdAt.slice(0, 10)
    if (dailyMap[key]) {
      dailyMap[key].views++
      dailyMap[key].sessions.add(r.sessionId)
    }
  })
  const dailyWeek = Object.entries(dailyMap).map(([date, { views, sessions }]) => ({
    date,
    views,
    sessions: sessions.size,
  }))

  return {
    todayViews,
    todaySessions,
    weekViews,
    weekSessions,
    monthViews,
    topPages,
    deviceBreakdown,
    hourlyToday,
    dailyWeek,
  }
}

/**
 * Fetch raw pageview records from Firestore (default last 90 days)
 * for custom multi-dimensional filtering in AdminAnalytics.
 */
export async function fetchAnalyticsRecords(days = 90): Promise<AnalyticsRecord[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)

  const col = collection(db, 'analytics_pageviews')
  let rows: AnalyticsRecord[] = []

  try {
    const q = query(
      col,
      where('createdAt', '>=', cutoff.toISOString()),
      orderBy('createdAt', 'desc'),
      limit(5000)
    )
    const snap = await getDocs(q)
    rows = snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        path: data.path || '/',
        title: data.title || 'الرئيسية',
        device: (data.device as 'mobile' | 'desktop' | 'tablet') || 'mobile',
        referrer: data.referrer || 'direct',
        sessionId: data.sessionId || d.id,
        createdAt: data.createdAt || new Date().toISOString(),
      }
    })
  } catch (err) {
    console.warn('Analytics range query fallback:', err)
    try {
      const fallbackSnap = await getDocs(query(col, limit(2000)))
      rows = fallbackSnap.docs
        .map(d => {
          const data = d.data()
          return {
            id: d.id,
            path: data.path || '/',
            title: data.title || 'الرئيسية',
            device: (data.device as 'mobile' | 'desktop' | 'tablet') || 'mobile',
            referrer: data.referrer || 'direct',
            sessionId: data.sessionId || d.id,
            createdAt: data.createdAt || new Date().toISOString(),
          }
        })
        .filter(r => r.createdAt >= cutoff.toISOString())
    } catch (e2) {
      console.error('Failed to load raw analytics:', e2)
      throw e2
    }
  }

  return rows
}
