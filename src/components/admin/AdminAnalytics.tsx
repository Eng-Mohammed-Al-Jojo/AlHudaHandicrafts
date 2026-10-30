import { useEffect, useState, useMemo } from 'react'
import {
  Users,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Calendar,
  Clock,
  BarChart2,
  Sparkles,
  RefreshCw,
  Globe,
  Filter,
  Search,
  X,
  Download,
  RotateCcw,
  CheckCircle2,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react'
import { fetchAnalyticsRecords, type AnalyticsRecord } from '../../analytics'

type PeriodType = 'today' | 'yesterday' | '7days' | 'this_month' | '30days' | 'custom'
type DeviceFilter = 'all' | 'mobile' | 'desktop' | 'tablet'
type PageTypeFilter = 'all' | 'home' | 'products' | 'categories' | 'checkout'

const DAY_LABELS: Record<string, string> = {
  '0': 'الأحد', '1': 'الإثنين', '2': 'الثلاثاء', '3': 'الأربعاء',
  '4': 'الخميس', '5': 'الجمعة', '6': 'السبت',
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const diff = Math.round((today.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000)
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'أمس'
  return `${DAY_LABELS[String(d.getDay())]} ${d.getDate()}/${d.getMonth() + 1}`
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 sm:p-5 shadow-xs flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#685D52] m-0 mb-0.5 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-[#221811] m-0 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-[#968B7E] m-0 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function BarChart({ values, labels, color = '#8D6527' }: {
  values: number[]
  labels: string[]
  color?: string
}) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 sm:gap-1.5 h-28 pt-2">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          {/* Tooltip on hover */}
          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-[#221811] text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-10 shadow-xs">
            {labels[i]}: {v}
          </div>
          <div
            className="w-full rounded-t transition-all group-hover:opacity-80"
            style={{
              height: `${Math.max((v / max) * 88, v > 0 ? 5 : 2)}px`,
              backgroundColor: v > 0 ? color : '#EADBCE',
              opacity: v > 0 ? 1 : 0.4,
            }}
          />
          <span className="text-[9px] sm:text-[10px] text-[#968B7E] leading-none truncate max-w-full">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [records, setRecords] = useState<AnalyticsRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filters State
  const [period, setPeriod] = useState<PeriodType>('7days')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all')
  const [pageType, setPageType] = useState<PageTypeFilter>('all')
  const [search, setSearch] = useState('')

  // View mode toggles for clarity between visits (sessions) and views (page loads)
  const [deviceMode, setDeviceMode] = useState<'visits' | 'views'>('visits')
  const [chartMetric, setChartMetric] = useState<'views' | 'visits'>('views')

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await fetchAnalyticsRecords(90)
      setRecords(data)
    } catch {
      setError('تعذّر تحميل بيانات الزيارات. تحققي من الاتصال بالإنترنت وصلاحيات الإدارة.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Reset all filters
  function resetFilters() {
    setPeriod('7days')
    setCustomFrom('')
    setCustomTo('')
    setDeviceFilter('all')
    setPageType('all')
    setSearch('')
  }

  const isFilterActive =
    period !== '7days' ||
    deviceFilter !== 'all' ||
    pageType !== 'all' ||
    search.trim() !== ''

  // ── Multi-dimensional Filter Engine ──
  const filteredRecords = useMemo(() => {
    const now = new Date()

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfYesterday = new Date(now)
    startOfYesterday.setDate(now.getDate() - 1)
    startOfYesterday.setHours(0, 0, 0, 0)

    const startOf7Days = new Date(now)
    startOf7Days.setDate(now.getDate() - 6)
    startOf7Days.setHours(0, 0, 0, 0)

    const startOf30Days = new Date(now)
    startOf30Days.setDate(now.getDate() - 29)
    startOf30Days.setHours(0, 0, 0, 0)

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return records.filter(r => {
      const createdAt = r.createdAt

      // 1. Period filter
      if (period === 'today') {
        if (createdAt < startOfToday.toISOString()) return false
      } else if (period === 'yesterday') {
        if (createdAt < startOfYesterday.toISOString() || createdAt >= startOfToday.toISOString()) return false
      } else if (period === '7days') {
        if (createdAt < startOf7Days.toISOString()) return false
      } else if (period === '30days') {
        if (createdAt < startOf30Days.toISOString()) return false
      } else if (period === 'this_month') {
        if (createdAt < startOfThisMonth.toISOString()) return false
      } else if (period === 'custom') {
        if (customFrom && createdAt < `${customFrom}T00:00:00.000Z`) return false
        if (customTo && createdAt > `${customTo}T23:59:59.999Z`) return false
      }

      // 2. Device filter
      if (deviceFilter !== 'all' && r.device !== deviceFilter) return false

      // 3. Page Type filter
      if (pageType === 'home') {
        if (r.path !== '/' && r.path !== '') return false
      } else if (pageType === 'products') {
        if (!r.path.startsWith('/products')) return false
      } else if (pageType === 'categories') {
        if (!r.path.startsWith('/categories')) return false
      } else if (pageType === 'checkout') {
        if (!r.path.startsWith('/cart') && !r.path.startsWith('/checkout') && !r.path.startsWith('/order')) return false
      }

      // 4. Search query filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchTitle = (r.title || '').toLowerCase().includes(q)
        const matchPath = (r.path || '').toLowerCase().includes(q)
        if (!matchTitle && !matchPath) return false
      }

      return true
    })
  }, [records, period, customFrom, customTo, deviceFilter, pageType, search])

  // ── Derived Analytics Metrics ──
  const metrics = useMemo(() => {
    const totalViews = filteredRecords.length
    const uniqueSessions = new Set(filteredRecords.map(r => r.sessionId)).size
    const pagesPerSession = uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : '0'

    // Separate counts for Pageviews (المشاهدات) vs Unique Visits / Sessions (الزيارات)
    const deviceViews = { mobile: 0, desktop: 0, tablet: 0 }
    const deviceSessionSets = {
      mobile: new Set<string>(),
      desktop: new Set<string>(),
      tablet: new Set<string>(),
    }

    filteredRecords.forEach(r => {
      if (r.device in deviceViews) {
        deviceViews[r.device]++
        deviceSessionSets[r.device].add(r.sessionId)
      }
    })

    const deviceVisits = {
      mobile: deviceSessionSets.mobile.size,
      desktop: deviceSessionSets.desktop.size,
      tablet: deviceSessionSets.tablet.size,
    }

    const totalDevViews = deviceViews.mobile + deviceViews.desktop + deviceViews.tablet
    const totalDevVisits = deviceVisits.mobile + deviceVisits.desktop + deviceVisits.tablet

    const mobileViewsPct = totalDevViews ? Math.round((deviceViews.mobile / totalDevViews) * 100) : 0
    const desktopViewsPct = totalDevViews ? Math.round((deviceViews.desktop / totalDevViews) * 100) : 0
    const tabletViewsPct = totalDevViews ? Math.round((deviceViews.tablet / totalDevViews) * 100) : 0

    const mobileVisitsPct = totalDevVisits ? Math.round((deviceVisits.mobile / totalDevVisits) * 100) : 0
    const desktopVisitsPct = totalDevVisits ? Math.round((deviceVisits.desktop / totalDevVisits) * 100) : 0
    const tabletVisitsPct = totalDevVisits ? Math.round((deviceVisits.tablet / totalDevVisits) * 100) : 0

    // Top Pages
    const pageCounts: Record<string, { title: string; count: number }> = {}
    filteredRecords.forEach(r => {
      const k = r.path
      if (!pageCounts[k]) pageCounts[k] = { title: r.title, count: 0 }
      pageCounts[k].count++
    })
    const topPages = Object.entries(pageCounts)
      .map(([path, data]) => ({ path, title: data.title, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)

    // Chart Data depending on period and chartMetric (views vs visits)
    const isSingleDay = period === 'today' || period === 'yesterday'
    let chartValues: number[] = []
    let chartLabels: string[] = []

    if (isSingleDay) {
      // 24 Hours
      chartLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`)
      if (chartMetric === 'views') {
        chartValues = Array(24).fill(0)
        filteredRecords.forEach(r => {
          const h = new Date(r.createdAt).getHours()
          chartValues[h]++
        })
      } else {
        const hourlySets: Set<string>[] = Array.from({ length: 24 }, () => new Set<string>())
        filteredRecords.forEach(r => {
          const h = new Date(r.createdAt).getHours()
          hourlySets[h].add(r.sessionId)
        })
        chartValues = hourlySets.map(s => s.size)
      }
      chartLabels = chartLabels.map((l, i) => (i % 3 === 0 ? `${i}h` : ''))
    } else {
      // Day by day
      const daysCount = period === '7days' ? 7 : period === '30days' ? 14 : 10
      const daysMap: Record<string, number> = {}
      const daysSessionMap: Record<string, Set<string>> = {}
      const now = new Date()
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        daysMap[key] = 0
        daysSessionMap[key] = new Set()
      }
      filteredRecords.forEach(r => {
        const k = r.createdAt.slice(0, 10)
        if (k in daysMap) {
          daysMap[k]++
          daysSessionMap[k].add(r.sessionId)
        }
      })
      chartLabels = Object.keys(daysMap).map(formatDayLabel)
      chartValues = chartMetric === 'views'
        ? Object.values(daysMap)
        : Object.values(daysSessionMap).map(s => s.size)
    }

    return {
      totalViews,
      uniqueSessions,
      pagesPerSession,
      deviceViews,
      deviceVisits,
      totalDevViews,
      totalDevVisits,
      mobileViewsPct,
      desktopViewsPct,
      tabletViewsPct,
      mobileVisitsPct,
      desktopVisitsPct,
      tabletVisitsPct,
      topPages,
      chartValues,
      chartLabels,
      isSingleDay,
    }
  }, [filteredRecords, period, chartMetric])

  // Export filtered pageviews to CSV
  function exportCSV() {
    if (filteredRecords.length === 0) return
    const header = 'الصفحة,المسار,الجهاز,الوقت,مصدر الزيارة,معرف الجلسة\n'
    const rows = filteredRecords.map(r =>
      `"${r.title}","${r.path}","${r.device}","${r.createdAt}","${r.referrer}","${r.sessionId}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alhuda_analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
        <div className="bg-white rounded-3xl border border-[#EADBCE] p-12 shadow-xs flex flex-col items-center justify-center gap-3 text-[#685D52]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C59B4B]" />
          <span className="text-sm font-medium">جاري تحميل بيانات الزيارات والإحصائيات...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
        <div className="bg-white rounded-3xl border border-[#EADBCE] p-10 shadow-xs text-center">
          <Globe className="w-10 h-10 text-[#968B7E] mx-auto mb-3" />
          <p className="text-sm text-[#685D52] m-0">{error}</p>
          <button
            onClick={() => load()}
            className="mt-4 px-5 py-2.5 rounded-full bg-[#8D6527] text-white text-xs font-bold hover:bg-[#704F1E] transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>لوحة المؤشرات والتحليلات</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
            إحصائيات وزوار المتجر
          </h1>
          <p className="text-xs text-[#685D52] m-0 mt-1">
            رصد مباشر لزيارات الزبائن وحركة التصفح مع فلاتر مخصصة متقدمة.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#EADBCE] text-xs font-bold text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] transition-colors disabled:opacity-40"
            title="تصدير النتائج إلى ملف CSV"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير CSV
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </button>
        </div>
      </div>

      {/* ── Filter Controls Card ── */}
      <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-[#FAF7F2] pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8D6527]" />
            <h3 className="text-sm font-bold text-[#221811] m-0">تصفية وفلاتر البيانات</h3>
            <span className="text-[11px] bg-[#FAF7F2] text-[#8D6527] font-bold px-2 py-0.5 rounded-full border border-[#EADBCE]">
              {filteredRecords.length} مشاهدة
            </span>
          </div>
          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>

        {/* 1. Time Period Buttons */}
        <div>
          <label className="text-[11px] font-bold text-[#685D52] mb-1.5 block">الفترة الزمنية:</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today',      label: 'اليوم' },
              { id: 'yesterday',  label: 'أمس' },
              { id: '7days',      label: 'آخر 7 أيام' },
              { id: 'this_month', label: 'هذا الشهر' },
              { id: '30days',     label: 'آخر 30 يوماً' },
              { id: 'custom',     label: 'تاريخ مخصص 📅' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as PeriodType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  period === p.id
                    ? 'bg-[#8D6527] text-white shadow-xs font-bold'
                    : 'bg-[#FAF7F2] text-[#685D52] hover:bg-[#EADBCE]/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {period === 'custom' && (
            <div className="mt-3 flex items-center gap-3 flex-wrap bg-[#FAF7F2] p-3 rounded-xl border border-[#EADBCE]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#685D52] font-medium">من تاريخ:</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="bg-white border border-[#EADBCE] rounded-lg px-2.5 py-1 text-xs text-[#221811] outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#685D52] font-medium">إلى تاريخ:</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="bg-white border border-[#EADBCE] rounded-lg px-2.5 py-1 text-xs text-[#221811] outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Device & Page Section & Search Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Device Filter */}
          <div>
            <label className="text-[11px] font-bold text-[#685D52] mb-1.5 block">نوع الجهاز:</label>
            <div className="grid grid-cols-4 gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EADBCE]">
              {[
                { id: 'all',     label: 'الكل' },
                { id: 'mobile',  label: 'جوال' },
                { id: 'desktop', label: 'كمبيوتر' },
                { id: 'tablet',  label: 'لوحي' },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setDeviceFilter(d.id as DeviceFilter)}
                  className={`py-1 text-[11px] rounded-lg font-semibold transition-all ${
                    deviceFilter === d.id
                      ? 'bg-white text-[#8D6527] shadow-xs font-bold'
                      : 'text-[#685D52] hover:text-[#221811]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page Section Filter */}
          <div>
            <label className="text-[11px] font-bold text-[#685D52] mb-1.5 block">قسم الصفحة:</label>
            <div className="grid grid-cols-5 gap-0.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#EADBCE]">
              {[
                { id: 'all',        label: 'الكل' },
                { id: 'home',       label: 'الرئيسية' },
                { id: 'products',   label: 'منتجات' },
                { id: 'categories', label: 'أقسام' },
                { id: 'checkout',   label: 'السلة' },
              ].map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setPageType(sec.id as PageTypeFilter)}
                  className={`py-1 text-[10px] rounded-lg font-semibold truncate transition-all ${
                    pageType === sec.id
                      ? 'bg-white text-[#8D6527] shadow-xs font-bold'
                      : 'text-[#685D52] hover:text-[#221811]'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search by Page / Path */}
          <div>
            <label className="text-[11px] font-bold text-[#685D52] mb-1.5 block">بحث في اسم أو رابط الصفحة:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#968B7E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="مثال: عبايات، تطريز، cart..."
                className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl pr-8 pl-7 py-1.5 text-xs text-[#221811] placeholder-[#968B7E] outline-none focus:border-[#8D6527]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#968B7E] hover:text-[#221811]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards (Filtered) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Eye}
          label="إجمالي المشاهدات"
          value={metrics.totalViews.toLocaleString('ar')}
          sub="مرات فتح وتصفح الصفحات"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Users}
          label="الزيارات الفريدة (الزوار)"
          value={metrics.uniqueSessions.toLocaleString('ar')}
          sub="جلسات زوار مستقلة"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="معدل التصفح"
          value={`${metrics.pagesPerSession} صفحة`}
          sub="مشاهدة لكل زيارة في المتوسط"
          color="bg-[#FAF7F2] text-[#8D6527]"
        />
        <StatCard
          icon={Smartphone}
          label="الجهاز الأكثر زيارة"
          value={`${metrics.desktopVisitsPct >= metrics.mobileVisitsPct ? 'كمبيوتر' : 'جوال'} (${Math.max(metrics.desktopVisitsPct, metrics.mobileVisitsPct)}%)`}
          sub={`${metrics.deviceVisits.desktop} زيارة كمبيوتر • ${metrics.deviceVisits.mobile} زيارة جوال`}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Primary Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EADBCE] p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C59B4B]" />
              <h3 className="text-sm font-bold text-[#221811] m-0">
                {metrics.isSingleDay ? 'حركة المتجر حسب ساعات اليوم' : 'توزيع الحركة اليومية بالفترة المحددة'}
              </h3>
            </div>
            {/* Metric Toggle: Views vs Visits */}
            <div className="flex items-center bg-[#FAF7F2] p-0.5 rounded-xl border border-[#EADBCE] text-[11px] font-bold self-start sm:self-auto">
              <button
                onClick={() => setChartMetric('views')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartMetric === 'views'
                    ? 'bg-[#8D6527] text-white shadow-xs font-bold'
                    : 'text-[#685D52] hover:text-[#221811]'
                }`}
              >
                المشاهدات ({metrics.totalViews})
              </button>
              <button
                onClick={() => setChartMetric('visits')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartMetric === 'visits'
                    ? 'bg-[#8D6527] text-white shadow-xs font-bold'
                    : 'text-[#685D52] hover:text-[#221811]'
                }`}
              >
                الزيارات ({metrics.uniqueSessions})
              </button>
            </div>
          </div>

          {metrics.totalViews === 0 ? (
            <div className="py-12 text-center text-xs text-[#968B7E]">
              لا توجد بيانات تطابق معايير الفلتر الحالي
            </div>
          ) : (
            <BarChart
              values={metrics.chartValues}
              labels={metrics.chartLabels}
              color={chartMetric === 'views' ? '#8D6527' : '#059669'}
            />
          )}

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#685D52] border-t border-[#FAF7F2] pt-2">
            <span className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm inline-block ${chartMetric === 'views' ? 'bg-[#8D6527]' : 'bg-[#059669]'}`} />
              يعرض الرسم البياني: <strong className="text-[#221811]">{chartMetric === 'views' ? 'مشاهدات الصفحات' : 'الزيارات الفريدة (الزوار)'}</strong>
            </span>
            <span className="text-[#968B7E]">{metrics.isSingleDay ? '24 ساعة' : `${metrics.chartLabels.length} أيام`}</span>
          </div>
        </div>

        {/* Device Breakdown (1 col) */}
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#C59B4B]" />
                <h3 className="text-sm font-bold text-[#221811] m-0">الأجهزة المستخدمة</h3>
              </div>
              {/* Toggle: Visits vs Views */}
              <div className="flex items-center bg-[#FAF7F2] p-0.5 rounded-lg border border-[#EADBCE] text-[10px] font-bold">
                <button
                  onClick={() => setDeviceMode('visits')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    deviceMode === 'visits'
                      ? 'bg-white text-[#8D6527] shadow-xs'
                      : 'text-[#685D52] hover:text-[#221811]'
                  }`}
                >
                  الزيارات
                </button>
                <button
                  onClick={() => setDeviceMode('views')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    deviceMode === 'views'
                      ? 'bg-white text-[#8D6527] shadow-xs'
                      : 'text-[#685D52] hover:text-[#221811]'
                  }`}
                >
                  المشاهدات
                </button>
              </div>
            </div>

            {metrics.totalViews === 0 ? (
              <p className="text-xs text-[#968B7E] text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="space-y-4">
                {/* Visual percentage bar */}
                {(() => {
                  const mPct = deviceMode === 'visits' ? metrics.mobileVisitsPct : metrics.mobileViewsPct
                  const dPct = deviceMode === 'visits' ? metrics.desktopVisitsPct : metrics.desktopViewsPct
                  const tPct = deviceMode === 'visits' ? metrics.tabletVisitsPct : metrics.tabletViewsPct
                  return (
                    <div className="h-3 rounded-full overflow-hidden flex bg-[#FAF7F2]">
                      {mPct > 0 && <div className="bg-purple-500 transition-all" style={{ width: `${mPct}%` }} title={`جوال ${mPct}%`} />}
                      {dPct > 0 && <div className="bg-blue-500 transition-all" style={{ width: `${dPct}%` }} title={`كمبيوتر ${dPct}%`} />}
                      {tPct > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${tPct}%` }} title={`لوحي ${tPct}%`} />}
                    </div>
                  )
                })()}

                {/* Device Rows with both metrics shown clearly */}
                <div className="space-y-3">
                  {[
                    {
                      icon: Smartphone,
                      label: 'جوال (هاتف)',
                      visits: metrics.deviceVisits.mobile,
                      visitsPct: metrics.mobileVisitsPct,
                      views: metrics.deviceViews.mobile,
                      viewsPct: metrics.mobileViewsPct,
                      color: 'bg-purple-50 text-purple-600',
                      bar: 'bg-purple-500',
                    },
                    {
                      icon: Monitor,
                      label: 'كمبيوتر (حاسوب)',
                      visits: metrics.deviceVisits.desktop,
                      visitsPct: metrics.desktopVisitsPct,
                      views: metrics.deviceViews.desktop,
                      viewsPct: metrics.desktopViewsPct,
                      color: 'bg-blue-50 text-blue-600',
                      bar: 'bg-blue-500',
                    },
                    {
                      icon: Tablet,
                      label: 'جهاز لوحي (تابلت)',
                      visits: metrics.deviceVisits.tablet,
                      visitsPct: metrics.tabletVisitsPct,
                      views: metrics.deviceViews.tablet,
                      viewsPct: metrics.tabletViewsPct,
                      color: 'bg-emerald-50 text-emerald-600',
                      bar: 'bg-emerald-500',
                    },
                  ].map(({ icon: Icon, label, visits, visitsPct, views, viewsPct, color, bar }) => {
                    const activeCount = deviceMode === 'visits' ? visits : views
                    const activePct = deviceMode === 'visits' ? visitsPct : viewsPct
                    const activeUnit = deviceMode === 'visits' ? 'زيارة' : 'مشاهدة'
                    const subInfo = deviceMode === 'visits'
                      ? `${views} مشاهدة صفحة`
                      : `${visits} زيارة مستقلة`

                    return (
                      <div key={label} className="p-2.5 rounded-xl bg-[#FAF7F2]/60 border border-[#EADBCE]/50">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="font-bold text-[#221811]">{label}</span>
                              <span className="font-bold text-[#8D6527] font-mono">
                                {activeCount} {activeUnit} ({activePct}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#968B7E] mb-1.5">
                              <span>{subInfo}</span>
                              {visits > 0 && (
                                <span>{(views / visits).toFixed(1)} صفحة/زيارة</span>
                              )}
                            </div>
                            <div className="h-1.5 bg-white rounded-full overflow-hidden border border-[#EADBCE]/50">
                              <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${activePct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Educational Note on visits vs views */}
          <div className="mt-4 pt-3 border-t border-[#FAF7F2] text-[11px] text-[#685D52] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EADBCE]/60">
            <p className="font-bold text-[#221811] m-0 mb-1">💡 ما الفرق بينهما؟</p>
            <p className="m-0 leading-relaxed text-[#685D52]">
              • <strong>الزيارة (الزائر):</strong> شخص دخل المتجر وتصفح.
              <br />
              • <strong>المشاهدة (الصفحة):</strong> كل صفحة فتحها الزائر أثناء تواجده (مثال: زائر واحد تصفح 8 صفحات = 1 زيارة، 8 مشاهدات).
            </p>
          </div>
        </div>
      </div>

      {/* ── Top Pages & Recent Activity Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Pages List */}
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#C59B4B]" />
              <h3 className="text-sm font-bold text-[#221811] m-0">أكثر الصفحات مشاهدةً في الفلتر</h3>
            </div>
            <span className="text-[11px] text-[#968B7E]">مرتبة حسب المشاهدات</span>
          </div>

          {metrics.topPages.length === 0 ? (
            <p className="text-xs text-[#968B7E] text-center py-8">لا توجد صفحات مطابقة للفلتر</p>
          ) : (
            <div className="space-y-3">
              {metrics.topPages.map((page, i) => {
                const maxCount = metrics.topPages[0]?.count || 1
                const pct = Math.round((page.count / maxCount) * 100)
                return (
                  <div key={page.path} className="group">
                    <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#FAF7F2] text-[#8D6527] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-bold text-[#221811] truncate">{page.title}</span>
                        <span className="text-[10px] text-[#968B7E] font-mono truncate" dir="ltr">{page.path}</span>
                      </div>
                      <span className="font-bold text-[#8D6527] shrink-0 font-mono">{page.count} زيارة</span>
                    </div>
                    <div className="h-1.5 bg-[#FAF7F2] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C59B4B] rounded-full transition-all group-hover:bg-[#8D6527]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Live Filtered Recent Activity Stream */}
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C59B4B]" />
              <h3 className="text-sm font-bold text-[#221811] m-0">سجل أحدث الزيارات المطابقة</h3>
            </div>
            <span className="text-[11px] text-[#968B7E]">آخر {Math.min(filteredRecords.length, 15)} زيارة</span>
          </div>

          {filteredRecords.length === 0 ? (
            <p className="text-xs text-[#968B7E] text-center py-8">لا توجد زيارات مسجلة تطابق الفلتر</p>
          ) : (
            <div className="divide-y divide-[#FAF7F2] overflow-y-auto max-h-[320px] -mx-2 px-2">
              {filteredRecords.slice(0, 15).map(r => {
                const DeviceIcon = r.device === 'desktop' ? Monitor : r.device === 'tablet' ? Tablet : Smartphone
                return (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center text-[#8D6527] shrink-0">
                        <DeviceIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#221811] m-0 truncate">{r.title}</p>
                        <p className="text-[10px] text-[#968B7E] m-0 font-mono truncate" dir="ltr">{r.path}</p>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-[11px] font-medium text-[#221811] m-0">{formatTime(r.createdAt)}</p>
                      <p className="text-[10px] text-[#968B7E] m-0">{formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Footer Note ── */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#EADBCE] p-4 flex items-start gap-3">
        <Globe className="w-4 h-4 text-[#8D6527] shrink-0 mt-0.5" />
        <p className="text-xs text-[#685D52] m-0 leading-relaxed">
          البيانات تُجمع من زيارات صفحات المتجر فقط (الرئيسية، المنتجات، الأقسام، السلة والدفع).
          يتم حفظ البيانات مباشرة في قاعدة بيانات المتجر ولا تُحجب بموانع الإعلانات،
          ويمكن استخدام الفلاتر أعلاه لعزل أي فترة أو جهاز أو قسم لدراسة سلوك الزبائن بدقة.
        </p>
      </div>

    </div>
  )
}
