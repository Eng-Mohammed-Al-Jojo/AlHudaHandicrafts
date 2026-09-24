import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  FileText,
  ShoppingBag,
  ArrowLeft,
  MessageCircle,
  ChevronDown,
  Check,
  X,
  ShieldCheck,
  Truck,
  AlertCircle,
  CreditCard,
  Info,
  Copy,
} from 'lucide-react'
import type { CartItem, CurrencyCode, PaymentMethod, PaymentMethodId, SiteSettings } from '../../types'
import Modal from '../ui/Modal'
import { useCurrency } from '../../context/CurrencyContext'
import { getFreeShippingStatus } from '../../utils/commerce'

export type CheckoutCurrencyDetails = {
  currency: CurrencyCode
  rate: number
  displayedAmount: number
  displayedTotal: string
}

export type CheckoutCustomerDetails = {
  customer: string
  phone: string
  email: string
  city: string
  address: string
  deliveryNotes: string
  notes: string
  requestedPaymentMethod: PaymentMethodId
}

interface Props {
  items: CartItem[]
  total: number
  settings: SiteSettings
  onSubmit: (details: CheckoutCustomerDetails, currencyDetails: CheckoutCurrencyDetails) => Promise<boolean>
  onClose: () => void
}

function normalizePhoneInput(value: string) {
  return value.replace(/[^\d+\s()-]/g, '')
}

function validateCustomerDetails(details: CheckoutCustomerDetails) {
  if (details.customer.length < 2) return 'يرجى كتابة الاسم الكريم بشكل صحيح.'
  const phoneDigits = details.phone.replace(/\D/g, '')
  if (phoneDigits.length < 9 || phoneDigits.length > 15) return 'يرجى إدخال رقم جوال صحيح، مثل 0591234567.'
  if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) return 'يرجى التحقق من صيغة البريد الإلكتروني.'
  if (details.city.length < 2) return 'يرجى اختيار المدينة.'
  if (details.address.length < 5) return 'يرجى كتابة عنوان التوصيل بالتفصيل.'
  return ''
}

export default function CheckoutModal({ items, total, settings, onSubmit, onClose }: Props) {
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState<PaymentMethodId | ''>('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const { currency, currentRate, convertPrice, formatPrice } = useCurrency()

  const isWhatsApp = settings.orderRouting === 'whatsapp'
  const {
    threshold: freeShippingLimit,
    isFreeShipping,
    remaining: remainingForFreeShipping,
  } = getFreeShippingStatus(total, settings.freeShippingThreshold)
  const ordersEnabled = settings.ordersEnabled !== false
  const deliveryCities = settings.deliveryCities.length > 0 ? settings.deliveryCities : ['غزة']
  const enabledPaymentMethods = settings.paymentMethods.filter(method => method.enabled)
  const selectedPaymentMethod = enabledPaymentMethods.find(method => method.id === paymentMethodId)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    const selectionIsAvailable = enabledPaymentMethods.some(method => method.id === paymentMethodId)
    if (!selectionIsAvailable && enabledPaymentMethods[0]) {
      setPaymentMethodId(enabledPaymentMethods[0].id)
    }
  }, [settings.paymentMethods, paymentMethodId])

  function handleClose() {
    if (!saving) onClose()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ordersEnabled || saving) return

    if (!selectedPaymentMethod || !paymentMethodId) {
      setFormError('اختاري طريقة الدفع الصحيحة قبل إتمام الطلب.')
      return
    }

    const details: CheckoutCustomerDetails = {
      customer: customer.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      address: address.trim(),
      deliveryNotes: deliveryNotes.trim(),
      notes: notes.trim(),
      requestedPaymentMethod: paymentMethodId,
    }
    const validationError = validateCustomerDetails(details)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setFormError('')
    setSaving(true)
    try {
      const saved = await onSubmit(details, {
        currency,
        rate: currentRate,
        displayedAmount: convertPrice(total, currency),
        displayedTotal: formatPrice(total, { showCode: true }),
      })
      if (saved) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={handleClose} size="sm" className="rounded-3xl overflow-hidden p-0 border border-[#EADBCE]">
      <div className="bg-white">
        <div className="bg-[#FAF7F2] p-6 border-b border-[#EADBCE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F1E5] text-[#8D6527] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                تأكيد الطلب
              </h3>
              <p className="text-[11px] text-[#685D52] m-0">أدخلي بيانات التواصل والتوصيل لجهيز طلبكِ</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="w-8 h-8 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-white hover:text-[#221811] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 bg-[#FAF7F2]/40 border-b border-[#EADBCE]">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-[#685D52]">ملخص الطلب:</span>
            <span className="font-bold text-[#221811]">{itemCount} قطع</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1 mb-3">
            {items.map(item => (
              <div key={item.id} className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[#EADBCE] bg-white">
                <img src={item.images[0]?.url} alt={item.name} className="w-full h-full object-cover" />
                {item.quantity > 1 && (
                  <span className="absolute bottom-0 right-0 bg-[#8D6527] text-white text-[9px] font-bold px-1 rounded-tl">×{item.quantity}</span>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1.5 py-2.5 border-t border-[#EADBCE]/60 text-xs">
            <div className="flex items-center justify-between text-[#685D52]">
              <span>مجموع المنتجات:</span>
              <span dir="ltr">{formatPrice(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#685D52] flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-[#8D6527]" /><span>الشحن:</span></span>
              {isFreeShipping ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                  {freeShippingLimit === 0 ? 'شحن مجاني لجميع الطلبات 🎉' : `شحن مجاني 🎉 (تجاوزت ${formatPrice(freeShippingLimit)})`}
                </span>
              ) : (
                <span className="text-[#8D6527] font-medium text-[11px]">
                  {remainingForFreeShipping > 0 ? `شحن عادي (متبقي ${formatPrice(remainingForFreeShipping)} للشحن المجاني)` : 'شحن مجاني'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#EADBCE]/60">
            <span className="text-xs font-semibold text-[#221811]">{currency === 'ILS' ? 'المبلغ الإجمالي' : 'القيمة التقديرية بعملة العرض'}</span>
            <div className="text-left">
              <strong className="text-lg font-bold text-[#8D6527] block" dir="ltr">{formatPrice(total, { showCode: true })}</strong>
              {currency !== 'ILS' && <span className="text-[10px] text-[#968B7E]">السعر الأساسي: {total.toLocaleString('en-US')} ₪</span>}
            </div>
          </div>
          {currency !== 'ILS' && (
            <p className="text-[10px] leading-5 text-[#685D52] bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-2 mb-0 mt-2">
              التحويل إلى {currency} لأغراض العرض فقط، ويُحسب بسعر {currentRate} ₪ لكل {currency} لحظة الطلب. تبقى القيمة الأساسية للطلب محفوظة بالشيكل.
            </p>
          )}
        </div>

        {!ordersEnabled && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>نعتذر، استقبال وتأكيد الطلبات متوقف مؤقتاً في الوقت الحالي.</span>
          </div>
        )}

        <form onSubmit={submit} noValidate className="p-6 space-y-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
              {formError}
            </div>
          )}

          <CheckoutField id="checkout-name" label="الاسم الكريم" required icon={<User className="w-4 h-4" />}>
            <input
              id="checkout-name"
              name="name"
              autoComplete="name"
              maxLength={80}
              required
              disabled={!ordersEnabled}
              value={customer}
              onChange={e => { setCustomer(e.target.value); setFormError('') }}
              placeholder="مثال: سارة أحمد"
              className={inputClass}
            />
          </CheckoutField>

          <CheckoutField id="checkout-phone" label="رقم الجوال / واتساب" required icon={<Phone className="w-4 h-4" />}>
            <input
              id="checkout-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              maxLength={25}
              required
              disabled={!ordersEnabled}
              value={phone}
              onChange={e => { setPhone(normalizePhoneInput(e.target.value)); setFormError('') }}
              placeholder="0591234567"
              dir="ltr"
              className={`${inputClass} text-left`}
            />
          </CheckoutField>

          <CheckoutField id="checkout-email" label="البريد الإلكتروني" hint="اختياري — لإرسال تأكيد الطلب" icon={<Mail className="w-4 h-4" />}>
            <input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete="email"
              enterKeyHint="next"
              maxLength={254}
              disabled={!ordersEnabled}
              value={email}
              onChange={e => { setEmail(e.target.value); setFormError('') }}
              placeholder="name@example.com"
              dir="ltr"
              className={`${inputClass} text-left`}
            />
          </CheckoutField>

          <div className="pt-2 border-t border-[#EADBCE]">
            <h4 className="text-sm font-bold text-[#221811] mb-3">بيانات التوصيل</h4>
            <div className="space-y-4">
              <CheckoutField id="checkout-city" label="المدينة / المنطقة" required icon={<Home className="w-4 h-4" />}>
                <CitySelect
                  id="checkout-city"
                  value={city}
                  options={deliveryCities}
                  disabled={!ordersEnabled}
                  onChange={value => { setCity(value); setFormError('') }}
                />
              </CheckoutField>

              <CheckoutField id="checkout-address" label="العنوان التفصيلي" required icon={<MapPin className="w-4 h-4" />}>
                <textarea
                  id="checkout-address"
                  name="address"
                  autoComplete="street-address"
                  rows={2}
                  maxLength={240}
                  required
                  disabled={!ordersEnabled}
                  value={address}
                  onChange={e => { setAddress(e.target.value); setFormError('') }}
                  placeholder="الحي، الشارع، رقم البناية، وأي علامة مميزة"
                  className={`${inputClass} resize-none`}
                />
              </CheckoutField>

              <CheckoutField id="checkout-delivery-notes" label="ملاحظات التوصيل" hint="اختياري" icon={<Truck className="w-4 h-4" />}>
                <textarea
                  id="checkout-delivery-notes"
                  name="deliveryNotes"
                  rows={2}
                  maxLength={500}
                  disabled={!ordersEnabled}
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  placeholder="مثال: الاتصال قبل الوصول، وقت مناسب للتسليم"
                  className={`${inputClass} resize-none`}
                />
              </CheckoutField>
            </div>
          </div>

          <div className="pt-2 border-t border-[#EADBCE]">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-[#8D6527]" />
              <h4 className="text-sm font-bold text-[#221811] m-0">طريقة الدفع</h4>
            </div>
            <p className="text-[11px] text-[#685D52] m-0 mb-3">اختاري الطريقة، وستظهر بيانات التحويل التي حددها المتجر قبل تأكيد الطلب.</p>
            {enabledPaymentMethods.length > 0 ? (
              <>
                <PaymentMethodSelect
                  methods={enabledPaymentMethods}
                  value={paymentMethodId}
                  onChange={value => { setPaymentMethodId(value); setFormError('') }}
                  disabled={!ordersEnabled}
                />
                {selectedPaymentMethod && <PaymentDetails method={selectedPaymentMethod} />}
                <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-5 text-[#685D52]">
                  <Info className="w-3.5 h-3.5 text-[#C59B4B] shrink-0 mt-0.5" />
                  <span>إرسال الطلب لا يعني تأكيد الدفع. يقوم الأدمن بمراجعة التحويل وتحديث حالة الدفع لاحقاً.</span>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">لم يتم تفعيل أي طريقة دفع بعد. تواصلي مع المتجر لإتمام الطلب.</div>
            )}
          </div>

          <CheckoutField id="checkout-notes" label="تفاصيل التطريز الخاصة" hint="اختياري" icon={<FileText className="w-4 h-4" />}>
            <textarea
              id="checkout-notes"
              name="notes"
              rows={2}
              maxLength={800}
              disabled={!ordersEnabled}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: حرف خاص، لون الخيط، مقاس، أو تعليمات التغليف"
              className={`${inputClass} resize-none`}
            />
          </CheckoutField>

          <div className="flex items-start gap-1.5 text-[11px] text-[#685D52] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C59B4B] shrink-0 mt-0.5" />
            <span>تُستخدم بياناتكِ للتواصل وتجهيز الطلب فقط، ولا يتم طلب بيانات بطاقات أو معلومات مالية حساسة.</span>
          </div>

          <button
            type="submit"
            disabled={saving || !ordersEnabled}
            className={`w-full py-3.5 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-white ${!ordersEnabled ? 'bg-stone-300 text-stone-600 cursor-not-allowed shadow-none hover:shadow-none' : isWhatsApp ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#8D6527] hover:bg-[#704F1E]'} disabled:opacity-60`}
          >
            {saving ? <span>جارٍ حفظ وتسجيل الطلب...</span> : !ordersEnabled ? <span>استقبال الطلبات متوقف مؤقتاً</span> : isWhatsApp ? <><MessageCircle className="w-4 h-4" /><span>إرسال الطلب عبر واتساب مباشرة</span></> : <><span>تأكيد الطلب وحفظه</span><ArrowLeft className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </Modal>
  )
}

function PaymentMethodSelect({ methods, value, onChange, disabled }: {
  methods: PaymentMethod[]
  value: PaymentMethodId | ''
  onChange: (value: PaymentMethodId) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="طريقة الدفع">
      {methods.map(method => {
        const selected = method.id === value
        return (
          <button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(method.id)}
            className={`text-right rounded-xl border p-3 transition-all ${selected ? 'border-[#8D6527] bg-[#FAF7F2] shadow-xs' : 'border-[#EADBCE] bg-white hover:border-[#C59B4B]'} disabled:opacity-60`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={`text-xs font-bold ${selected ? 'text-[#8D6527]' : 'text-[#221811]'}`}>{method.label}</span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? 'border-[#8D6527] bg-[#8D6527]' : 'border-[#C8BCAF]'}`}>
                {selected && <Check className="w-3 h-3 text-white" />}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function CopyablePaymentValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copyValue() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const helper = document.createElement('textarea')
        helper.value = value
        helper.style.position = 'fixed'
        helper.style.opacity = '0'
        document.body.appendChild(helper)
        helper.select()
        document.execCommand('copy')
        helper.remove()
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.warn('Copy payment value failed:', error)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 max-w-[72%]">
      <strong className="text-emerald-900 truncate" dir="ltr">{value}</strong>
      <button
        type="button"
        onClick={() => void copyValue()}
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
        title={copied ? 'تم نسخ البيانات' : `نسخ ${label}`}
        aria-label={copied ? `تم نسخ ${label}` : `نسخ ${label}`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  )
}

function PaymentDetails({ method }: { method: PaymentMethod }) {
  const rows = [
    method.accountName && { label: 'اسم صاحب الحساب', value: method.accountName },
    method.accountNumber && { label: method.id === 'bank_palestine' ? 'رقم الحساب' : 'رقم الجوال / المحفظة', value: method.accountNumber, copyable: true },
    method.iban && { label: 'الـ IBAN', value: method.iban, copyable: true },
    method.branch && { label: 'الفرع', value: method.branch },
    method.paymentLink && { label: 'رابط الدفع', value: method.paymentLink, link: true },
  ].filter(Boolean) as Array<{ label: string; value: string; link?: boolean; copyable?: boolean }>

  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
      <p className="text-xs font-bold text-emerald-900 m-0 mb-2">بيانات التحويل — {method.label}</p>
      {rows.length > 0 ? (
        <div className="space-y-1.5">
          {rows.map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-emerald-800/75 shrink-0">{row.label}</span>
              {row.link ? (
                <a href={row.value} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-800 underline underline-offset-2 truncate" dir="ltr">{row.value}</a>
              ) : (
                row.copyable ? <CopyablePaymentValue label={row.label} value={row.value} /> : <strong className="text-emerald-900 text-left" dir="rtl">{row.value}</strong>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-amber-800 m-0">لم يتم ضبط بيانات هذه الطريقة بعد. تواصلي مع المتجر قبل إرسال الطلب.</p>
      )}
      {method.instructions && <p className="text-[11px] leading-5 text-emerald-900 m-0 mt-2 whitespace-pre-line">{method.instructions}</p>}
    </div>
  )
}

function CitySelect({ id, value, options, onChange, disabled }: {
  id: string
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const uniqueOptions = Array.from(new Set(options.map(option => option.trim()).filter(Boolean)))

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full min-h-[20px] flex items-center justify-between gap-2 text-right text-xs text-[#221811] outline-none disabled:opacity-60"
      >
        <span className={value ? 'font-semibold' : 'text-[#968B7E]'}>{value || 'اختاري المدينة أو المنطقة'}</span>
        <ChevronDown className={`w-4 h-4 text-[#8D6527] transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      <input type="hidden" name="city" value={value} />
      {open && !disabled && (
        <div className="absolute top-[calc(100%+8px)] right-0 left-0 z-40 max-h-56 overflow-y-auto rounded-2xl border border-[#EADBCE] bg-white p-1.5 shadow-xl animate-scale-in" role="listbox">
          {uniqueOptions.map(option => {
            const selected = option === value
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs text-right transition-colors ${selected ? 'bg-[#FAF7F2] text-[#8D6527] font-bold' : 'text-[#685D52] hover:bg-[#FAF7F2] hover:text-[#221811]'}`}
              >
                <span>{option}</span>
                {selected && <Check className="w-3.5 h-3.5 text-[#8D6527] shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inputClass = 'w-full border-0 outline-none text-xs text-[#221811] bg-transparent placeholder-[#968B7E] disabled:opacity-60'

function CheckoutField({ id, label, required, hint, icon, children }: {
  id: string
  label: string
  required?: boolean
  hint?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#221811] mb-1.5">
        <span className="inline-flex items-center gap-1.5"><span className="text-[#8D6527]">{icon}</span>{label}{required && <span className="text-red-500">*</span>}</span>
        {hint && <span className="block text-[10px] font-normal text-[#968B7E] mr-5 mt-0.5">{hint}</span>}
      </label>
      <div className="flex items-start gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 focus-within:border-[#8D6527] focus-within:bg-white transition-all">
        {children}
      </div>
    </div>
  )
}
