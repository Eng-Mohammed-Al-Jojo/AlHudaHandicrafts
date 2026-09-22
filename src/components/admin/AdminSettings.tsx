import { useEffect, useState, type FormEvent } from 'react'
import { Settings, Save, Sparkles, MessageCircle, LayoutDashboard, Truck, Phone, Mail, MapPin, Power, CheckCircle2, AlertTriangle, Coins, DollarSign, Euro, Camera, ThumbsUp, Music2 } from 'lucide-react'
import type { SiteSettings } from '../../types'

interface Props {
  settings: SiteSettings
  onSave: (settings: SiteSettings) => Promise<void>
  notify: (message: string, type?: 'success' | 'error') => void
}

export default function AdminSettings({ settings, onSave, notify }: Props) {
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(settings), [settings])
  const field = (key: keyof SiteSettings, value: string | number | boolean) =>
    setDraft(current => ({ ...current, [key]: value }))
  const socialField = (key: keyof SiteSettings['socialLinks'], value: string) =>
    setDraft(current => ({ ...current, socialLinks: { ...current.socialLinks, [key]: value } }))

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
    const normalized = {
      ...draft,
      whatsappNumber: draft.whatsappNumber.replace(/[^0-9]/g, ''),
      socialLinks,
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
            يتم تخزين أسعار المنتجات بالشيكل كأساس، ويتم التحويل تلقائياً عند اختيار الزبون للدولار أو اليورو من المتجر بناءً على هذه الأسعار.
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
                  value={String(draft.usdRate ?? 3.65)}
                  onChange={e => field('usdRate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all"
                  placeholder="3.65"
                />
                <span className="absolute left-3.5 top-2.5 text-xs text-[#968B7E] font-medium">شيكل</span>
              </div>
              <p className="text-[11px] text-[#685D52] mt-2 m-0">
                مثال: قطعة بسعر 100 شيكل ستظهر للزبون بـ{' '}
                <strong className="text-emerald-700">
                  ${(100 / (draft.usdRate || 3.65)).toFixed(2)}
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
                  value={String(draft.eurRate ?? 3.95)}
                  onChange={e => field('eurRate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all"
                  placeholder="3.95"
                />
                <span className="absolute left-3.5 top-2.5 text-xs text-[#968B7E] font-medium">شيكل</span>
              </div>
              <p className="text-[11px] text-[#685D52] mt-2 m-0">
                مثال: قطعة بسعر 100 شيكل ستظهر للزبون بـ{' '}
                <strong className="text-blue-700">
                  €{(100 / (draft.eurRate || 3.95)).toFixed(2)}
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
