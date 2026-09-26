import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Settings,
  Save,
  Sparkles,
  MessageCircle,
  LayoutDashboard,
  Truck,
  Phone,
  Mail,
  MapPin,
  Power,
  Coins,
  DollarSign,
  Euro,
  Camera,
  ThumbsUp,
  Music2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Check,
  X,
  RotateCcw,
  Download,
  Upload,
  ShieldCheck,
  AlertCircle,
  Sliders,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react'
import { db } from '../../firebase'
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore'
import { DEFAULT_SITE_SETTINGS, type SiteSettings, type PaymentMethod, type PaymentMethodDetails } from '../../types'

interface Props {
  settings: SiteSettings
  onSave: (settings: SiteSettings) => Promise<void>
  notify: (message: string, type?: 'success' | 'error') => void
}

export type SettingsTabId = 'general' | 'shipping' | 'payment' | 'communication' | 'currencies' | 'backup'

export interface SettingsTabInfo {
  id: SettingsTabId
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

export const SETTINGS_TABS: SettingsTabInfo[] = [
  {
    id: 'general',
    label: 'الإعدادات العامة وهيكل المتجر',
    shortLabel: 'عامة والمتجر',
    icon: Sliders,
    description: 'تخصيص اسم المتجر، أرقام التواصل للمقر، وحالة استقبال الطلبات للزبائن.',
  },
  {
    id: 'shipping',
    label: 'الشحن ومناطق التوصيل',
    shortLabel: 'الشحن والتوصيل',
    icon: Truck,
    description: 'حد الشحن المجاني التلقائي وإدارة ترتيب وأسماء مدن ومحافظات التوصيل.',
  },
  {
    id: 'payment',
    label: 'طرق الدفع والتحصيل',
    shortLabel: 'طرق الدفع',
    icon: CreditCard,
    description: 'إدارة بوابات وحسابات الدفع (بنك فلسطين، المحافظ الرقمية، وغيرها) وتعليمات التحويل.',
  },
  {
    id: 'communication',
    label: 'التواصل وتوجيه الطلبات',
    shortLabel: 'التواصل والطلبات',
    icon: MessageCircle,
    description: 'مسار استلام الطلبات (لوحة التحكم المباشرة أو واتساب)، رقم واتساب، وروابط حسابات التواصل.',
  },
  {
    id: 'currencies',
    label: 'العملات وأسعار الصرف',
    shortLabel: 'العملات والصرف',
    icon: Coins,
    description: 'تحديد أسعار صرف الدولار واليورو مقابل الشيكل مع معاينة حية لكيفية ظهور الأسعار للزبائن.',
  },
  {
    id: 'backup',
    label: 'النسخ الاحتياطي والأمان',
    shortLabel: 'النسخ الاحتياطي',
    icon: ShieldCheck,
    description: 'تنزيل نسخة احتياطية شاملة لجميع بيانات المتجر أو استعادة نسخة سابقة بأمان تام.',
  },
]

export default function AdminSettings({ settings, onSave, notify }: Props) {
  const { tab } = useParams<{ tab?: string }>()
  const navigate = useNavigate()

  const [draft, setDraft] = useState(settings)
  const [cityInput, setCityInput] = useState('')
  const [editingCityIndex, setEditingCityIndex] = useState<number | null>(null)
  const [editingCityValue, setEditingCityValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setDraft(settings), [settings])

  // Determine active tab from URL param or default to 'general'
  const isValidTab = (t?: string): t is SettingsTabId =>
    Boolean(t && SETTINGS_TABS.some(item => item.id === t))

  const activeTab: SettingsTabId = isValidTab(tab) ? tab : 'general'

  function switchTab(nextTab: SettingsTabId) {
    navigate(`/admin/settings/${nextTab}`)
  }

  const currentTabIndex = SETTINGS_TABS.findIndex(t => t.id === activeTab)
  const nextTabInfo = currentTabIndex < SETTINGS_TABS.length - 1 ? SETTINGS_TABS[currentTabIndex + 1] : null
  const prevTabInfo = currentTabIndex > 0 ? SETTINGS_TABS[currentTabIndex - 1] : null

  // Check if draft has unsaved changes compared to saved settings
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(settings)

  const usdPreviewRate = Number(draft.usdRate) > 0 ? Number(draft.usdRate) : DEFAULT_SITE_SETTINGS.usdRate
  const eurPreviewRate = Number(draft.eurRate) > 0 ? Number(draft.eurRate) : DEFAULT_SITE_SETTINGS.eurRate

  const field = (key: keyof SiteSettings, value: string | number | boolean) =>
    setDraft(current => ({ ...current, [key]: value }))
  const socialField = (key: keyof SiteSettings['socialLinks'], value: string) =>
    setDraft(current => ({ ...current, socialLinks: { ...current.socialLinks, [key]: value } }))
  const paymentField = (id: SiteSettings['paymentMethods'][number]['id'], patch: Partial<SiteSettings['paymentMethods'][number]>) =>
    setDraft(current => ({
      ...current,
      paymentMethods: current.paymentMethods.map(method => method.id === id ? { ...method, ...patch } : method),
    }))

  function addDeliveryCity() {
    const city = cityInput.trim()
    if (!city) return
    if (draft.deliveryCities.some(c => c.toLowerCase() === city.toLowerCase())) {
      notify(`المدينة "${city}" مضافة بالفعل مسبقاً.`, 'error')
      return
    }
    setDraft(current => ({
      ...current,
      deliveryCities: [...current.deliveryCities, city],
    }))
    setCityInput('')
  }

  function removeDeliveryCity(index: number) {
    const cityName = draft.deliveryCities[index]
    setDraft(current => ({
      ...current,
      deliveryCities: current.deliveryCities.filter((_, i) => i !== index),
    }))
    if (editingCityIndex === index) {
      setEditingCityIndex(null)
      setEditingCityValue('')
    }
    notify(`تم حذف "${cityName}" من مدن التوصيل.`)
  }

  function startEditingCity(index: number, currentName: string) {
    setEditingCityIndex(index)
    setEditingCityValue(currentName)
  }

  function saveEditingCity(index: number) {
    const trimmed = editingCityValue.trim()
    if (!trimmed) {
      notify('يرجى إدخال اسم المدينة.', 'error')
      return
    }
    const exists = draft.deliveryCities.some((c, i) => i !== index && c.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      notify(`المدينة "${trimmed}" مضافة بالفعل في القائمة.`, 'error')
      return
    }
    setDraft(current => {
      const list = [...current.deliveryCities]
      list[index] = trimmed
      return { ...current, deliveryCities: list }
    })
    setEditingCityIndex(null)
    setEditingCityValue('')
    notify(`تم تعديل اسم المدينة بنجاح إلى "${trimmed}".`)
  }

  function cancelEditingCity() {
    setEditingCityIndex(null)
    setEditingCityValue('')
  }

  function moveDeliveryCity(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= draft.deliveryCities.length) return
    setDraft(current => {
      const list = [...current.deliveryCities]
      const temp = list[index]
      list[index] = list[targetIndex]
      list[targetIndex] = temp
      return { ...current, deliveryCities: list }
    })
    if (editingCityIndex === index) {
      setEditingCityIndex(targetIndex)
    } else if (editingCityIndex === targetIndex) {
      setEditingCityIndex(index)
    }
  }

  function resetDeliveryCitiesToDefault() {
    setDraft(current => ({
      ...current,
      deliveryCities: [...DEFAULT_SITE_SETTINGS.deliveryCities],
    }))
    setEditingCityIndex(null)
    setEditingCityValue('')
    notify('تمت استعادة قائمة المدن الافتراضية بنجاح.')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const socialLinks = Object.fromEntries(
      Object.entries(draft.socialLinks).map(([platform, url]) => [platform, url.trim()])
    ) as SiteSettings['socialLinks']

    const invalidSocialLink = Object.values(socialLinks).find(url => {
      if (!url) return false
      try {
        const parsed = new URL(url)
        return parsed.protocol !== 'https:' && parsed.protocol !== 'http:'
      } catch {
        return true
      }
    })
    if (invalidSocialLink) {
      switchTab('communication')
      notify('أدخلي رابطاً كاملاً وآمناً يبدأ بـ https:// أو http:// لحسابات التواصل.', 'error')
      return
    }

    const paymentMethods = draft.paymentMethods.map(method => ({
      ...method,
      label: method.label.trim(),
      accountName: (method.accountName ?? '').trim(),
      accountNumber: (method.accountNumber ?? '').trim(),
      iban: (method.iban ?? '').trim(),
      branch: (method.branch ?? '').trim(),
      instructions: (method.instructions ?? method.details ?? '').trim(),
      paymentLink: (method.paymentLink ?? '').trim(),
      details: (method.instructions ?? method.details ?? '').trim(),
    }))

    if (!paymentMethods.some(method => method.enabled)) {
      switchTab('payment')
      notify('فعّلي طريقة دفع واحدة على الأقل قبل حفظ الإعدادات.', 'error')
      return
    }

    const invalidPaymentMethod = paymentMethods.find(method => {
      if (!method.enabled) return false
      if (method.paymentLink) {
        try {
          const parsed = new URL(method.paymentLink)
          if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return true
        } catch {
          return true
        }
      }
      if (method.id === 'other') return !method.instructions
      if (method.id === 'bank_palestine') {
        return !method.accountName || (!method.accountNumber && !method.iban)
      }
      return !method.accountNumber
    })
    if (invalidPaymentMethod) {
      switchTab('payment')
      const label = invalidPaymentMethod.label || 'طريقة الدفع'
      notify(`أضيفي بيانات الدفع الصحيحة للبن «${label}» قبل تفعيله.`, 'error')
      return
    }

    const normalized = {
      ...draft,
      whatsappNumber: draft.whatsappNumber.replace(/[^0-9]/g, ''),
      deliveryCities: Array.from(new Set(draft.deliveryCities.map(city => city.trim()).filter(Boolean))),
      paymentMethods,
      socialLinks,
    }

    if (!Number.isFinite(normalized.usdRate) || normalized.usdRate <= 0 || !Number.isFinite(normalized.eurRate) || normalized.eurRate <= 0) {
      switchTab('currencies')
      notify('أدخلي سعر صرف صحيحاً وأكبر من صفر للدولار واليورو.', 'error')
      return
    }

    if (normalized.orderRouting === 'whatsapp' && !normalized.whatsappNumber) {
      switchTab('communication')
      notify('أدخلي رقم واتساب بصيغة دولية قبل تفعيل التحويل إلى واتساب.', 'error')
      return
    }

    setSaving(true)
    try {
      await onSave(normalized)
      notify('تم حفظ إعدادات المتجر وتطبيقها فوراً على واجهة المتجر بنجاح.')
    } catch (error) {
      const code = (error as { code?: string }).code
      notify(
        code === 'permission-denied'
          ? 'تم رفض الحفظ من قواعد Firestore. تحققي من تسجيل الدخول بحساب الأدمن.'
          : 'تعذر حفظ الإعدادات. تحققي من الاتصال بقاعدة البيانات.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Backup: export all Firestore collections to JSON ───────────────────────
  async function handleBackup() {
    setBackingUp(true)
    try {
      const colNames = ['products', 'categories', 'orders', 'settings', 'subscribers']
      const backup: Record<string, unknown[]> = {}
      await Promise.all(
        colNames.map(async name => {
          const snap = await getDocs(collection(db, name))
          backup[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        })
      )
      backup['_meta'] = [{ exportedAt: new Date().toISOString(), version: 1 }] as unknown[]
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `alhuda-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify('✅ تم تنزيل النسخة الاحتياطية بنجاح — احتفظي بالملف في مكان آمن.')
    } catch (err) {
      console.error('Backup error:', err)
      notify('❌ تعذر إنشاء النسخة الاحتياطية. تحققي من الاتصال.', 'error')
    } finally {
      setBackingUp(false)
    }
  }

  // ── Restore: import JSON and re-write all collections ───────────────────────
  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.name.endsWith('.json')) {
      notify('يُرجى اختيار ملف .json صادر من نظام النسخ الاحتياطي.', 'error')
      return
    }

    let data: Record<string, unknown[]>
    try {
      data = JSON.parse(await file.text())
    } catch {
      notify('الملف المختار تالف أو غير صالح. تأكدي من الملف وأعيدي المحاولة.', 'error')
      return
    }

    const knownCols = ['products', 'categories', 'orders', 'settings', 'subscribers']
    const hasAtLeastOne = knownCols.some(c => Array.isArray(data[c]))
    if (!hasAtLeastOne) {
      notify('لم يتم التعرف على محتوى الملف. تأكدي أنه ملف نسخة احتياطية صحيح من نظام الهدى.', 'error')
      return
    }

    if (!window.confirm('سيتم استبدال جميع بيانات المتجر الحالية بمحتوى النسخة الاحتياطية. هل تريدين المتابعة؟')) {
      return
    }

    setRestoring(true)
    try {
      for (const colName of knownCols) {
        const rows = data[colName]
        if (!Array.isArray(rows)) continue

        // Delete existing docs
        const snap = await getDocs(collection(db, colName))
        const delBatch = writeBatch(db)
        snap.docs.forEach(d => delBatch.delete(doc(db, colName, d.id)))
        await delBatch.commit()

        // Write restored docs in batches of 400
        for (let i = 0; i < rows.length; i += 400) {
          const batch = writeBatch(db)
          rows.slice(i, i + 400).forEach(row => {
            const r = row as Record<string, unknown>
            const id = String(r['id'] ?? '')
            if (!id) return
            const { id: _id, ...fields } = r
            void _id
            batch.set(doc(db, colName, id), fields)
          })
          await batch.commit()
        }
      }
      notify('✅ تمت استعادة النسخة الاحتياطية بنجاح. أعيدي تحميل الصفحة لرؤية التغييرات.')
    } catch (err) {
      console.error('Restore error:', err)
      notify('❌ تعذر استعادة النسخة الاحتياطية. قد يكون هناك مشكلة في الاتصال أو الصلاحيات.', 'error')
    } finally {
      setRestoring(false)
    }
  }

  const currentTab = SETTINGS_TABS.find(t => t.id === activeTab) || SETTINGS_TABS[0]

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* ════════════════════════════════════════════
          PAGE HEADER & QUICK STATUS
         ════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
        <div>
          <div className="eyebrow mb-1.5 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>لوحة التحكم • إعدادات وتخصيص المتجر</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
            إعدادات متجر الهدى
          </h1>
          <p className="text-xs text-[#685D52] m-0 mt-1 max-w-xl leading-relaxed">
            {currentTab.description}
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            draft.ordersEnabled !== false
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-900 border border-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${draft.ordersEnabled !== false ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{draft.ordersEnabled !== false ? 'الطلبات مفعّلة' : 'الطلبات متوقفة'}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF7F2] text-[#8D6527] border border-[#EADBCE]">
            <Truck className="w-3 h-3 text-[#8D6527]" />
            <span>شحن مجاني: {draft.freeShippingThreshold} ₪</span>
          </span>

          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>تعديلات غير محفوظة</span>
            </span>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          HORIZONTAL CATEGORY TABS (SUB ITEMS)
         ════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#EADBCE] p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {SETTINGS_TABS.map(tabItem => {
            const TabIcon = tabItem.icon
            const isCurrent = tabItem.id === activeTab
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => switchTab(tabItem.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-[#8D6527] text-white shadow-sm'
                    : 'text-[#685D52] hover:bg-[#FAF7F2] hover:text-[#221811] bg-transparent'
                }`}
              >
                <TabIcon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-[#8D6527]'}`} />
                <span>{tabItem.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MAIN TAB CONTENT (FORM)
         ════════════════════════════════════════════ */}
      <form onSubmit={submit} className="space-y-6">

        {/* ── TAB 1: GENERAL & STORE INFO ── */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            {/* Tab header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#EADBCE]">
              <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  الإعدادات العامة وهيكل المتجر
                </h3>
                <p className="text-xs text-[#685D52] m-0 mt-0.5">
                  تحكمي بحالة استقبال الطلبات، واسم المتجر، وبيانات التواصل الأساسية التي تظهر في المتجر والفواتير.
                </p>
              </div>
            </div>

            {/* Orders Master Switch */}
            <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
              draft.ordersEnabled !== false
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-amber-50/70 border-amber-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-xs ${
                    draft.ordersEnabled !== false ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    <Power className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#221811] m-0">نظام استقبال وتأكيد الطلبات</h4>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        draft.ordersEnabled !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-200 text-amber-900'
                      }`}>
                        {draft.ordersEnabled !== false ? 'مفعّل ونشط' : 'متوقف مؤقتاً'}
                      </span>
                    </div>
                    <p className="text-xs text-[#685D52] m-0 mt-1">
                      {draft.ordersEnabled !== false
                        ? 'الزبائن قادرون على إتمام وحفظ الطلبات عبر المتجر بصورة طبيعية.'
                        : 'استقبال الطلبات متوقف حالياً؛ سيظهر تنبيه لطيف للزبائن ويتم تعطيل زر إتمام الشراء.'}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => field('ordersEnabled', draft.ordersEnabled === false ? true : false)}
                    className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out p-0.5 ${
                      draft.ordersEnabled !== false ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                    role="switch"
                    aria-checked={draft.ordersEnabled !== false}
                  >
                    <span
                      className={`inline-block h-6.5 w-6.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        draft.ordersEnabled !== false ? 'ms-auto' : 'me-auto'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Store Name */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  اسم المتجر
                </label>
                <input
                  required
                  value={draft.storeName}
                  onChange={e => field('storeName', e.target.value)}
                  placeholder="الهدى للتطريز الفاخر"
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#8D6527]" />
                  <span>رقم الهاتف المعتمد</span>
                </label>
                <input
                  value={draft.phone}
                  onChange={e => field('phone', e.target.value)}
                  placeholder="059xxxxxxx"
                  dir="ltr"
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#8D6527]" />
                  <span>البريد الإلكتروني الرسمي</span>
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={e => field('email', e.target.value)}
                  placeholder="info@alhuda-embroidery.com"
                  dir="ltr"
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8D6527]" />
                  <span>عنوان المشغل / المقر</span>
                </label>
                <input
                  value={draft.address}
                  onChange={e => field('address', e.target.value)}
                  placeholder="فلسطين — توصيل لجميع المحافظات"
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs text-[#685D52]">
              <Info className="w-4 h-4 text-[#8D6527] shrink-0 mt-0.5" />
              <span>تظهر هذه البيانات مباشرة في تذييل صفحات المتجر وصفحات تأكيد الطلب للزبائن.</span>
            </div>

            <SaveBar saving={saving} hasUnsavedChanges={hasUnsavedChanges} onReset={() => setDraft(settings)} nextTab={nextTabInfo} onNext={() => nextTabInfo && switchTab(nextTabInfo.id)} />
          </div>
        )}

        {/* ── TAB 2: SHIPPING & DELIVERY ── */}
        {activeTab === 'shipping' && (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            {/* Tab header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#EADBCE]">
              <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  الشحن ومناطق التوصيل
                </h3>
                <p className="text-xs text-[#685D52] m-0 mt-0.5">
                  حددي شروط الشحن المجاني وقائمة المدن والمناطق وترتيبها في قائمة إتمام الطلب.
                </p>
              </div>
            </div>

            {/* Free Shipping Threshold */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/60 space-y-2">
              <label className="block text-xs font-bold text-[#221811] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#8D6527]" />
                <span>حد الشحن المجاني التلقائي (شيكل)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={String(draft.freeShippingThreshold)}
                  onChange={e => field('freeShippingThreshold', Number(e.target.value) || 0)}
                  className="max-w-xs bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all font-bold"
                />
                <span className="text-xs text-[#685D52]">شيكل</span>
              </div>
              <p className="text-[11px] text-[#685D52] m-0 leading-relaxed">
                يظهر شريط علوي تلقائي يخبر الزبائن بحد الشحن المجاني، ويحتسب المتبقي لهم في السلة لتشجيعهم على إكمال الشراء.
              </p>
            </div>

            {/* Delivery Cities Management */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#8D6527]" />
                  <h4 className="font-serif text-base font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                    مدن ومناطق التوصيل
                  </h4>
                  <span className="text-xs bg-[#8D6527]/10 text-[#8D6527] font-semibold px-2.5 py-0.5 rounded-full">
                    {draft.deliveryCities.length} مدينة
                  </span>
                </div>

                {draft.deliveryCities.length > 0 && (
                  <button
                    type="button"
                    onClick={resetDeliveryCitiesToDefault}
                    className="inline-flex items-center gap-1 text-[11px] text-[#968B7E] hover:text-[#8D6527] transition-colors cursor-pointer"
                    title="استعادة القائمة الافتراضية"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة المدن الافتراضية</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-[#685D52] m-0">
                تحكمي في أسماء المدن وترتيب ظهورها للزبونة في نافذة إتمام الطلب (من الأعلى للأسفل). استخدمي الأسهم لتغيير الترتيب، وزر التعديل لتغيير الاسم.
              </p>

              {/* Add City Input */}
              <div className="flex gap-2">
                <input
                  value={cityInput}
                  onChange={event => setCityInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addDeliveryCity()
                    }
                  }}
                  placeholder="اسم مدينة أو منطقة جديدة (مثال: دير البلح — البلد)"
                  className="flex-1 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={addDeliveryCity}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] active:scale-[0.98] px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {/* Cities List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {draft.deliveryCities.map((city, index) => {
                  const isEditing = editingCityIndex === index
                  const isFirst = index === 0
                  const isLast = index === draft.deliveryCities.length - 1

                  return (
                    <div
                      key={`${city}-${index}`}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] hover:bg-white transition-all shadow-xs group"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Position Number */}
                        <span className="w-6 h-6 rounded-lg bg-[#EADBCE]/70 text-[#8D6527] text-[11px] font-bold flex items-center justify-center shrink-0 select-none">
                          {index + 1}
                        </span>

                        {/* City Name or Edit Input */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                              type="text"
                              value={editingCityValue}
                              onChange={e => setEditingCityValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  saveEditingCity(index)
                                } else if (e.key === 'Escape') {
                                  cancelEditingCity()
                                }
                              }}
                              autoFocus
                              className="w-full bg-white border border-[#8D6527] rounded-lg px-2.5 py-1 text-xs text-[#221811] outline-none shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => saveEditingCity(index)}
                              className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              title="حفظ التعديل (Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingCity}
                              className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors cursor-pointer"
                              title="إلغاء التعديل (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-[#221811] truncate">{city}</span>
                        )}
                      </div>

                      {/* Actions: Move Up, Move Down, Edit, Delete */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move Up */}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => moveDeliveryCity(index, 'up')}
                            className={`p-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${
                              isFirst
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-[#685D52] hover:text-[#8D6527] hover:bg-[#EADBCE]/50 active:scale-95'
                            }`}
                            title="تحريك لأعلى"
                            aria-label={`تحريك ${city} لأعلى`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => moveDeliveryCity(index, 'down')}
                            className={`p-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${
                              isLast
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-[#685D52] hover:text-[#8D6527] hover:bg-[#EADBCE]/50 active:scale-95'
                            }`}
                            title="تحريك لأسفل"
                            aria-label={`تحريك ${city} لأسفل`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => startEditingCity(index, city)}
                            className="p-1.5 rounded-lg text-[#685D52] hover:text-[#8D6527] hover:bg-[#EADBCE]/50 active:scale-95 transition-all cursor-pointer"
                            title="تعديل اسم المدينة"
                            aria-label={`تعديل اسم ${city}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => removeDeliveryCity(index)}
                            className="p-1.5 rounded-lg text-[#968B7E] hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all cursor-pointer"
                            title="حذف المدينة"
                            aria-label={`حذف ${city}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {draft.deliveryCities.length === 0 && (
                  <div className="text-center py-6 px-4 rounded-xl border border-dashed border-[#EADBCE] bg-[#FAF7F2]">
                    <p className="text-xs text-[#968B7E] mb-2">لم تُضف أي مدن بعد في قائمة التوصيل.</p>
                    <button
                      type="button"
                      onClick={resetDeliveryCitiesToDefault}
                      className="inline-flex items-center gap-1.5 text-xs text-[#8D6527] hover:underline font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استعادة المدن الافتراضية</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <SaveBar saving={saving} hasUnsavedChanges={hasUnsavedChanges} onReset={() => setDraft(settings)} prevTab={prevTabInfo} onPrev={() => prevTabInfo && switchTab(prevTabInfo.id)} nextTab={nextTabInfo} onNext={() => nextTabInfo && switchTab(nextTabInfo.id)} />
          </div>
        )}

        {/* ── TAB 3: PAYMENT METHODS ── */}
        {activeTab === 'payment' && (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            {/* Tab header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#EADBCE]">
              <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  طرق الدفع وتأكيد الدفع
                </h3>
                <p className="text-xs text-[#685D52] m-0 mt-0.5">
                  أضيفي بيانات كل طريقة وشرحها هنا. لن يمكن إنهاء الطلب كـ«مكتمل» من لوحة التحكم قبل تسجيل تأكيد الدفع.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {draft.paymentMethods.map(method => (
                <PaymentMethodEditor
                  key={method.id}
                  method={method}
                  onToggle={enabled => paymentField(method.id, { enabled })}
                  onFieldChange={(key, value) => paymentField(method.id, { [key]: value })}
                />
              ))}
            </div>

            <SaveBar saving={saving} hasUnsavedChanges={hasUnsavedChanges} onReset={() => setDraft(settings)} prevTab={prevTabInfo} onPrev={() => prevTabInfo && switchTab(prevTabInfo.id)} nextTab={nextTabInfo} onNext={() => nextTabInfo && switchTab(nextTabInfo.id)} />
          </div>
        )}

        {/* ── TAB 4: COMMUNICATION & ORDER ROUTING ── */}
        {activeTab === 'communication' && (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            {/* Tab header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#EADBCE]">
              <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  التواصل وتوجيه واستلام الطلبات
                </h3>
                <p className="text-xs text-[#685D52] m-0 mt-0.5">
                  تحديد مسار إرسال الطلبات للعملاء (واتساب أو لوحة التحكم)، ورقم واتساب المعتمد، وحسابات التواصل الاجتماعي.
                </p>
              </div>
            </div>

            {/* Order Routing Choice */}
            <div>
              <h4 className="font-serif text-base font-bold text-[#221811] m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
                طريقة توجيه واستلام الطلبات
              </h4>
              <p className="text-xs text-[#685D52] m-0 mb-4">
                في كلتا الحالتين يتم حفظ الطلب دائماً في قاعدة البيانات ولوحة التحكم لضمان عدم ضياع أي طلب.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dashboard Routing */}
                <label
                  onClick={() => field('orderRouting', 'dashboard')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    draft.orderRouting === 'dashboard'
                      ? 'border-[#8D6527] bg-[#FAF7F2]'
                      : 'border-[#EADBCE] bg-white hover:border-[#C59B4B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-[#8D6527]" />
                    <span className="font-bold text-sm text-[#221811]">لوحة التحكم المباشرة</span>
                  </div>
                  <p className="text-xs text-[#685D52] m-0 leading-relaxed">
                    يُسجل الطلب فوراً في قسم الطلبات باللوحة، مع إمكانية تحديث حالته والتواصل لاحقاً.
                  </p>
                </label>

                {/* WhatsApp Routing */}
                <label
                  onClick={() => field('orderRouting', 'whatsapp')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    draft.orderRouting === 'whatsapp'
                      ? 'border-emerald-600 bg-emerald-50/50'
                      : 'border-[#EADBCE] bg-white hover:border-emerald-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm text-[#221811]">تحويل تلقائي إلى واتساب</span>
                  </div>
                  <p className="text-xs text-[#685D52] m-0 leading-relaxed">
                    يُحفظ الطلب باللوحة، وتُفتح نافذة واتساب للزبونة برسالة منسقة بأسماء القطع والإجمالي.
                  </p>
                </label>
              </div>
            </div>

            {/* WhatsApp Number for Orders */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/60">
              <label className="block text-xs font-bold text-[#221811] mb-1.5 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>رقم واتساب المعتمد للطلبات والتواصل</span>
              </label>
              <input
                value={draft.whatsappNumber}
                onChange={e => field('whatsappNumber', e.target.value)}
                placeholder="970591234567 (أرقام دولية بلا +)"
                dir="ltr"
                className="max-w-md w-full bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all text-left font-mono"
              />
              <small className="block mt-1.5 text-[#968B7E] text-[11px]">
                صيغة دولية كاملة بدون مسافات أو علامة +، مثلاً: 970591234567
              </small>
            </div>

            {/* Social Media Links */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#8D6527]" />
                <h4 className="font-serif text-base font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  روابط منصات التواصل الاجتماعي
                </h4>
              </div>
              <p className="text-xs text-[#685D52] m-0 mb-4">
                أضيفي رابط الحساب كاملاً. ستظهر الأيقونة تلقائياً في تذييل المتجر عند تعبئة الرابط.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SocialLinkField icon={Camera} label="إنستغرام" placeholder="https://instagram.com/your-account" value={draft.socialLinks?.instagram ?? ''} onChange={value => socialField('instagram', value)} />
                <SocialLinkField icon={ThumbsUp} label="فيسبوك" placeholder="https://facebook.com/your-page" value={draft.socialLinks?.facebook ?? ''} onChange={value => socialField('facebook', value)} />
                <SocialLinkField icon={Music2} label="تيك توك" placeholder="https://tiktok.com/@your-account" value={draft.socialLinks?.tiktok ?? ''} onChange={value => socialField('tiktok', value)} />
              </div>
            </div>

            <SaveBar saving={saving} hasUnsavedChanges={hasUnsavedChanges} onReset={() => setDraft(settings)} prevTab={prevTabInfo} onPrev={() => prevTabInfo && switchTab(prevTabInfo.id)} nextTab={nextTabInfo} onNext={() => nextTabInfo && switchTab(nextTabInfo.id)} />
          </div>
        )}

        {/* ── TAB 5: CURRENCIES & EXCHANGE RATES ── */}
        {activeTab === 'currencies' && (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            {/* Tab header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#EADBCE]">
              <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  أسعار صرف العملات المتعددة (مقابل الشيكل)
                </h3>
                <p className="text-xs text-[#685D52] m-0 mt-0.5">
                  تحديد أسعار الصرف الحية للعملات الأجنبية لعرض الأسعار للعملاء من خارج فلسطين.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#685D52] m-0 leading-relaxed">
              أسعار المنتجات والإجماليات الأساسية تُحفظ وتُدار بالشيكل. يغيّر هذا الإعداد قيمة العرض بالدولار أو اليورو فقط، وتُحفظ نسخة من العملة وسعر الصرف داخل كل طلب حتى لا تتغير مع تعديلات الأسعار لاحقاً.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* USD Rate */}
              <div className="p-5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/60 space-y-2">
                <label className="block text-xs font-bold text-[#221811] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>سعر صرف الدولار (USD)</span>
                  </span>
                  <span className="text-[11px] text-[#8D6527] font-semibold">1$ = كم شيكل؟</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={String(draft.usdRate ?? DEFAULT_SITE_SETTINGS.usdRate)}
                    onChange={e => field('usdRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all font-bold"
                    placeholder={String(DEFAULT_SITE_SETTINGS.usdRate)}
                  />
                  <span className="absolute left-3.5 top-2.5 text-xs text-[#968B7E] font-medium">شيكل</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#EADBCE] text-[11px] text-[#685D52] mt-2">
                  معاينة: قطعة بسعر 100 شيكل ستظهر للزبون بـ{' '}
                  <strong className="text-emerald-700 font-bold">
                    ${(100 / usdPreviewRate).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* EUR Rate */}
              <div className="p-5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/60 space-y-2">
                <label className="block text-xs font-bold text-[#221811] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Euro className="w-4 h-4 text-blue-600" />
                    <span>سعر صرف اليورو (EUR)</span>
                  </span>
                  <span className="text-[11px] text-[#8D6527] font-semibold">1€ = كم شيكل؟</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={String(draft.eurRate ?? DEFAULT_SITE_SETTINGS.eurRate)}
                    onChange={e => field('eurRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all font-bold"
                    placeholder={String(DEFAULT_SITE_SETTINGS.eurRate)}
                  />
                  <span className="absolute left-3.5 top-2.5 text-xs text-[#968B7E] font-medium">شيكل</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#EADBCE] text-[11px] text-[#685D52] mt-2">
                  معاينة: قطعة بسعر 100 شيكل ستظهر للزبون بـ{' '}
                  <strong className="text-blue-700 font-bold">
                    €{(100 / eurPreviewRate).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            <SaveBar saving={saving} hasUnsavedChanges={hasUnsavedChanges} onReset={() => setDraft(settings)} prevTab={prevTabInfo} onPrev={() => prevTabInfo && switchTab(prevTabInfo.id)} nextTab={nextTabInfo} onNext={() => nextTabInfo && switchTab(nextTabInfo.id)} />
          </div>
        )}

        {/* ── TAB 6: BACKUP & DATA PROTECTION ── */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            {/* Tab header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#EADBCE]">
              <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  النسخ الاحتياطي والأمان
                </h3>
                <p className="text-xs text-[#685D52] m-0 mt-0.5">
                  تصدير كافة بيانات المتجر كملف JSON لحفظها، أو استيراد نسخة احتياطية سابقة لاستعادة البيانات.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Export Card */}
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#221811] m-0">تنزيل نسخة احتياطية</p>
                    <p className="text-[11px] text-[#685D52] m-0 mt-0.5">تصدير فوري لكافة المجموعات</p>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed m-0">
                  سيتم تنزيل ملف يحتوي على المنتجات، الأقسام، الطلبات، إعدادات المتجر، وقائمة المشتركين. احتفظي بهذا الملف في مكان آمن دورياً.
                </p>
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={backingUp || restoring}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold px-5 py-3 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{backingUp ? 'جارٍ التصدير والتنزيل...' : 'تنزيل النسخة الاحتياطية الآن'}</span>
                </button>
              </div>

              {/* Import Card */}
              <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#221811] m-0">استيراد واستعادة البيانات</p>
                    <p className="text-[11px] text-[#685D52] m-0 mt-0.5">استعادة من ملف Backup سابق</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-100/70 border border-amber-200/80">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed m-0">
                    سيتم <strong>استبدال</strong> جميع البيانات الحالية بالكامل بمحتوى الملف المختار. تأكدي من الملف قبل المتابعة.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={restoring || backingUp}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold px-5 py-3 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{restoring ? 'جارٍ الاستعادة والتطبيق...' : 'اختيار ملف الاستعادة (.json)'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EADBCE] flex items-center justify-between">
              {prevTabInfo && (
                <button
                  type="button"
                  onClick={() => switchTab(prevTabInfo.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#685D52] hover:text-[#8D6527] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق: {prevTabInfo.shortLabel}</span>
                </button>
              )}
            </div>
          </div>
        )}

      </form>

    </div>
  )
}

function SaveBar({
  saving,
  hasUnsavedChanges,
  onReset,
  prevTab,
  onPrev,
  nextTab,
  onNext,
}: {
  saving: boolean
  hasUnsavedChanges: boolean
  onReset?: () => void
  prevTab?: SettingsTabInfo | null
  onPrev?: () => void
  nextTab?: SettingsTabInfo | null
  onNext?: () => void
}) {
  return (
    <div className="pt-5 border-t border-[#EADBCE] flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Navigation shortcuts */}
      <div className="flex items-center gap-2 order-2 sm:order-1">
        {prevTab && (
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#685D52] hover:text-[#8D6527] px-3 py-2 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>{prevTab.shortLabel}</span>
          </button>
        )}
        {nextTab && (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#685D52] hover:text-[#8D6527] px-3 py-2 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            <span>{nextTab.shortLabel}</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Save Action & Unsaved indicator */}
      <div className="flex items-center gap-3 order-1 sm:order-2 self-end sm:self-auto">
        {hasUnsavedChanges && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-[#968B7E] hover:text-red-600 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            تراجع عن التعديلات
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#8D6527] hover:bg-[#704F1E] active:scale-[0.98] text-white text-xs font-bold px-8 py-3.5 shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جارٍ حفظ الإعدادات...' : 'حفظ إعدادات المتجر'}</span>
        </button>
      </div>
    </div>
  )
}

function SocialLinkField({ icon: Icon, label, placeholder, value, onChange }: {
  icon: typeof Camera
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-[#8D6527]" />
        <span>{label}</span>
      </label>
      <input
        type="url"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
      />
    </div>
  )
}

function PaymentMethodEditor({ method, onToggle, onFieldChange }: {
  method: PaymentMethod
  onToggle: (enabled: boolean) => void
  onFieldChange: (key: keyof PaymentMethodDetails, value: string) => void
}) {
  const isBank = method.id === 'bank_palestine'
  const isOther = method.id === 'other'
  const configured = isOther
    ? Boolean((method.instructions ?? method.details ?? '').trim())
    : method.id === 'bank_palestine'
      ? Boolean(method.accountName?.trim() && (method.accountNumber?.trim() || method.iban?.trim()))
      : Boolean(method.accountNumber?.trim())
  const fieldClass = 'w-full bg-white border border-[#EADBCE] rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all disabled:cursor-not-allowed disabled:bg-[#FAF7F2]'

  return (
    <div className={`p-4 rounded-2xl border transition-colors ${method.enabled ? 'border-[#C59B4B]/50 bg-[#FAF7F2]/60' : 'border-[#EADBCE] bg-white opacity-75'}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#EADBCE] text-[#8D6527] flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#221811] m-0">{method.label}</p>
            <p className={`text-[10px] m-0 mt-0.5 ${method.enabled && !configured ? 'text-amber-700' : 'text-[#968B7E]'}`}>{method.enabled ? configured ? 'مفعّلة — جاهزة للعرض' : 'مفعّلة — تحتاج بيانات' : 'معطلة'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggle(!method.enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors p-0.5 ${method.enabled ? 'bg-emerald-600' : 'bg-stone-300'}`}
          role="switch"
          aria-checked={method.enabled}
          aria-label={`${method.enabled ? 'تعطيل' : 'تفعيل'} ${method.label}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${method.enabled ? 'ms-auto' : 'me-auto'}`} />
        </button>
      </div>

      <PaymentInput label={isOther ? 'اسم صاحب الحساب (اختياري)' : 'اسم صاحب الحساب / المحفظة'} value={method.accountName} onChange={value => onFieldChange('accountName', value)} disabled={!method.enabled} placeholder="مثال: اسم صاحب الحساب" />
      <PaymentInput label={isBank ? 'رقم الحساب' : isOther ? 'رقم الحساب أو الجوال (اختياري)' : 'رقم الجوال / المحفظة'} value={method.accountNumber} onChange={value => onFieldChange('accountNumber', value)} disabled={!method.enabled} placeholder={isBank ? 'أدخلي رقم الحساب' : 'مثال: 0591234567'} dir="ltr" />
      {isBank && <PaymentInput label="الـ IBAN (اختياري إذا كان رقم الحساب كافياً)" value={method.iban} onChange={value => onFieldChange('iban', value)} disabled={!method.enabled} placeholder="PS00XXXXXXXXXXXXXXXXXXXX" dir="ltr" />}
      {isBank && <PaymentInput label="اسم الفرع / البنك" value={method.branch} onChange={value => onFieldChange('branch', value)} disabled={!method.enabled} placeholder="مثال: فرع غزة" />}
      <PaymentInput label="رابط الدفع (اختياري)" value={method.paymentLink} onChange={value => onFieldChange('paymentLink', value)} disabled={!method.enabled} placeholder="https://..." dir="ltr" />

      <label className="block text-[11px] font-semibold text-[#685D52] mt-3 mb-1.5">
        {isOther ? 'شرح طريقة الدفع وخطوات التأكيد *' : 'تعليمات الدفع (اختياري)'}
      </label>
      <textarea
        rows={isOther ? 4 : 2}
        value={method.instructions ?? method.details ?? ''}
        onChange={event => onFieldChange('instructions', event.target.value)}
        placeholder={isOther ? 'اكتبي طريقة الدفع والخطوات التي يجب أن تتبعها العميلة' : 'مثال: أرسلي رقم العملية بعد التحويل'}
        className={`${fieldClass} resize-none`}
        disabled={!method.enabled}
      />
    </div>
  )
}

function PaymentInput({ label, value, onChange, disabled, placeholder, dir }: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  placeholder: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <label className="block mt-3 first:mt-0">
      <span className="block text-[11px] font-semibold text-[#685D52] mb-1.5">{label}</span>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        dir={dir}
        className="w-full bg-white border border-[#EADBCE] rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all disabled:cursor-not-allowed disabled:bg-[#FAF7F2]"
      />
    </label>
  )
}
