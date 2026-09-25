import { useEffect, useState, type FormEvent } from 'react'
import { Settings, Save, Sparkles, MessageCircle, LayoutDashboard, Truck, Phone, Mail, MapPin, Power, CheckCircle2, AlertTriangle, Coins, DollarSign, Euro, Camera, ThumbsUp, Music2, Plus, Trash2, ArrowUp, ArrowDown, Edit3, Check, X, RotateCcw } from 'lucide-react'
import { DEFAULT_SITE_SETTINGS, type SiteSettings, type PaymentMethod, type PaymentMethodDetails } from '../../types'

interface Props {
  settings: SiteSettings
  onSave: (settings: SiteSettings) => Promise<void>
  notify: (message: string, type?: 'success' | 'error') => void
}

export default function AdminSettings({ settings, onSave, notify }: Props) {
  const [draft, setDraft] = useState(settings)
  const [cityInput, setCityInput] = useState('')
  const [editingCityIndex, setEditingCityIndex] = useState<number | null>(null)
  const [editingCityValue, setEditingCityValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(settings), [settings])
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
      // Keep the old field in sync for older clients and messages.
      details: (method.instructions ?? method.details ?? '').trim(),
    }))
    if (!paymentMethods.some(method => method.enabled)) {
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
      notify('أدخلي سعر صرف صحيحاً وأكبر من صفر للدولار واليورو.', 'error')
      return
    }
    if (normalized.orderRouting === 'whatsapp' && !normalized.whatsappNumber) {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="eyebrow mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>هوية المتجر وتجربة الزبائن</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
            إعدادات متجر الهدى
          </h1>
          <p className="text-xs text-[#685D52] m-0 mt-1">
            تخصيص اسم المتجر، أرقام التواصل، حد الشحن المجاني، وطريقة استلام الطلبات.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={submit} className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 shadow-xs space-y-6">
        
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
                  <h3 className="text-sm font-bold text-[#221811] m-0">نظام استقبال وتأكيد الطلبات</h3>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Store Name */}
          <div>
            <label className="block text-xs font-semibold text-[#221811] mb-1.5">
              اسم المتجر
            </label>
            <input
              required
              value={draft.storeName}
              onChange={e => field('storeName', e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
            />
          </div>

          {/* Free Shipping Threshold */}
          <div>
            <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#8D6527]" />
              <span>حد الشحن المجاني (شيكل)</span>
            </label>
            <input
              type="number"
              min="0"
              value={String(draft.freeShippingThreshold)}
              onChange={e => field('freeShippingThreshold', Number(e.target.value) || 0)}
              className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
            />
          </div>

          {/* WhatsApp for Orders */}
          <div>
            <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>رقم واتساب لاستقبال الطلبات</span>
            </label>
            <input
              value={draft.whatsappNumber}
              onChange={e => field('whatsappNumber', e.target.value)}
              placeholder="970591234567 (أرقام دولية بلا +)"
              dir="ltr"
              className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
            />
            <small className="block mt-1 text-[#968B7E] text-[11px]">
              صيغة دولية كاملة بدون مسافات، مثلاً: 970591234567
            </small>
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
              <span>البريد الإلكتروني</span>
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

        {/* Delivery Cities */}
        <div className="pt-6 border-t border-[#EADBCE]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#8D6527]" />
              <h4 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
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
                className="inline-flex items-center gap-1 text-[11px] text-[#968B7E] hover:text-[#8D6527] transition-colors self-start sm:self-auto cursor-pointer"
                title="استعادة القائمة الافتراضية"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة المدن الافتراضية</span>
              </button>
            )}
          </div>

          <p className="text-xs text-[#685D52] m-0 mb-4">
            تحكمي في أسماء المدن وترتيب ظهورها للزبونة في نافذة إتمام الطلب (من الأعلى للأسفل). استخدمي الأسهم لتغيير الترتيب، وزر التعديل لتغيير الاسم.
          </p>

          {/* Add City Input */}
          <div className="flex gap-2 mb-4">
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

        {/* Payment Methods */}
        <div className="pt-6 border-t border-[#EADBCE]">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-[#8D6527]" />
            <h4 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              طرق الدفع وتأكيد الدفع
            </h4>
          </div>
          <p className="text-xs text-[#685D52] m-0 mb-4">
            أضيفي بيانات كل طريقة وشرحها هنا. لن يمكن إنهاء الطلب كـ«مكتمل» من لوحة التحكم قبل تسجيل تأكيد الدفع.
          </p>
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
        </div>

        {/* Social Media */}
        <div className="pt-6 border-t border-[#EADBCE]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#8D6527]" />
            <h4 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              روابط مواقع التواصل الاجتماعي
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

        {/* Order Routing Method Choice */}
        <div className="pt-6 border-t border-[#EADBCE]">
          <h4 className="font-serif text-lg font-bold text-[#221811] m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
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

        {/* Currency Exchange Rates */}
        <div className="pt-6 border-t border-[#EADBCE]">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-[#8D6527]" />
            <h4 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              أسعار صرف العملات المتعددة (مقابل الشيكل)
            </h4>
          </div>
          <p className="text-xs text-[#685D52] m-0 mb-4">
            أسعار المنتجات والإجماليات الأساسية تُحفظ وتُدار بالشيكل. يغيّر هذا الإعداد قيمة العرض بالدولار أو اليورو فقط، وتُحفظ نسخة من العملة وسعر الصرف داخل كل طلب حتى لا تتغير مع تعديلات الأسعار لاحقاً.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* USD Rate */}
            <div className="p-4 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/60">
              <label className="block text-xs font-bold text-[#221811] mb-1.5 flex items-center justify-between">
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
                  className="w-full bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all"
                  placeholder={String(DEFAULT_SITE_SETTINGS.usdRate)}
                />
                <span className="absolute left-3.5 top-2.5 text-xs text-[#968B7E] font-medium">شيكل</span>
              </div>
              <p className="text-[11px] text-[#685D52] mt-2 m-0">
                مثال: قطعة بسعر 100 شيكل ستظهر للزبون بـ{' '}
                <strong className="text-emerald-700">
                  ${(100 / usdPreviewRate).toFixed(2)}
                </strong>
              </p>
            </div>

            {/* EUR Rate */}
            <div className="p-4 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/60">
              <label className="block text-xs font-bold text-[#221811] mb-1.5 flex items-center justify-between">
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
                  className="w-full bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all"
                  placeholder={String(DEFAULT_SITE_SETTINGS.eurRate)}
                />
                <span className="absolute left-3.5 top-2.5 text-xs text-[#968B7E] font-medium">شيكل</span>
              </div>
              <p className="text-[11px] text-[#685D52] mt-2 m-0">
                مثال: قطعة بسعر 100 شيكل ستظهر للزبون بـ{' '}
                <strong className="text-blue-700">
                  €{(100 / eurPreviewRate).toFixed(2)}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-[#EADBCE] flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-8 py-3.5 shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جارٍ حفظ الإعدادات...' : 'حفظ إعدادات المتجر'}</span>
          </button>
        </div>

      </form>

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
