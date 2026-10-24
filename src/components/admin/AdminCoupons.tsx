import { useState, type FormEvent } from 'react'
import {
  Plus,
  Trash2,
  Ticket,
  Sparkles,
  Percent,
  Coins,
  Calendar,
  Clock,
  Hash,
  Edit3,
  CheckCircle2,
  Power,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import type { Coupon } from '../../types'
import Modal from '../ui/Modal'
import SelectMenu from '../ui/SelectMenu'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props {
  coupons: Coupon[]
  onAdd: (c: Omit<Coupon, 'id'>) => Promise<void>
  onUpdate?: (id: string, patch: Partial<Coupon>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  notify: (msg: string, type?: 'success' | 'error') => void
}

const EMPTY_FORM = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  usageLimit: '',
  isActive: true,
}

export default function AdminCoupons({ coupons, onAdd, onUpdate, onDelete, notify }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState(EMPTY_FORM)

  // Custom Confirm Dialog State
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; code: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Deduplicate coupons by id in case any duplicate state lingers
  const uniqueCoupons = Array.from(
    new Map(coupons.map(c => [c.id, c])).values()
  )

  function openCreateModal() {
    setEditingCoupon(null)
    setDraft({
      ...EMPTY_FORM,
      startDate: new Date().toISOString().slice(0, 10),
    })
    setShowForm(true)
  }

  function openEditModal(c: Coupon) {
    setEditingCoupon(c)
    setDraft({
      code: c.code,
      type: c.type,
      value: String(c.value),
      startDate: c.startDate,
      endDate: c.endDate,
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      isActive: c.isActive !== false,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleanCode = draft.code.trim().toUpperCase()
    if (!cleanCode) {
      notify('يرجى إدخال كود الكوبون.', 'error')
      return
    }
    const numValue = Number(draft.value)
    if (!numValue || numValue <= 0) {
      notify('يرجى إدخال قيمة خصم صحيحة وأكبر من صفر.', 'error')
      return
    }
    if (draft.type === 'percentage' && numValue > 100) {
      notify('نسبة الخصم المئوية لا يمكن أن تتجاوز 100%.', 'error')
      return
    }
    if (!draft.startDate || !draft.endDate) {
      notify('يرجى تحديد تاريخ البداية والنهاية للكوبون.', 'error')
      return
    }
    if (new Date(draft.endDate) < new Date(draft.startDate)) {
      notify('تاريخ النهاية يجب أن يكون بعد أو مساوياً لتاريخ البداية.', 'error')
      return
    }

    setSubmitting(true)
    try {
      if (editingCoupon && onUpdate) {
        await onUpdate(editingCoupon.id, {
          code: cleanCode,
          type: draft.type,
          value: numValue,
          startDate: draft.startDate,
          endDate: draft.endDate,
          usageLimit: draft.usageLimit ? Number(draft.usageLimit) : undefined,
          isActive: draft.isActive,
        })
        notify(`تم تحديث الكوبون «${cleanCode}» بنجاح ✨`)
      } else {
        await onAdd({
          code: cleanCode,
          type: draft.type,
          value: numValue,
          startDate: draft.startDate,
          endDate: draft.endDate,
          usageLimit: draft.usageLimit ? Number(draft.usageLimit) : undefined,
          usedCount: 0,
          isActive: draft.isActive,
        })
        notify('تمت إضافة كوبون الخصم بنجاح 🎉')
      }
      setShowForm(false)
      setEditingCoupon(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await onDelete(confirmDelete.id)
      notify(`تم حذف الكوبون «${confirmDelete.code}» بنجاح.`)
      setConfirmDelete(null)
    } catch (err) {
      console.error(err)
      notify('تعذر حذف الكوبون.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleStatus(c: Coupon) {
    if (!onUpdate) return
    try {
      const nextStatus = !c.isActive
      await onUpdate(c.id, { isActive: nextStatus })
      notify(nextStatus ? `تم تفعيل الكوبون «${c.code}»` : `تم تعطيل الكوبون «${c.code}»`)
    } catch (err) {
      console.error(err)
    }
  }

  const now = new Date()

  const typeOptions = [
    { value: 'percentage', label: 'نسبة مئوية (%)', icon: <Percent className="w-4 h-4 text-[#8D6527]" /> },
    { value: 'fixed', label: 'مبلغ ثابت (شيكل ₪)', icon: <Coins className="w-4 h-4 text-[#8D6527]" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EADBCE]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0 border border-[#8D6527]/20 shadow-xs">
            <Ticket className="w-5 h-5 text-[#8D6527]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                إدارة كوبونات الخصم
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#8D6527]/10 text-[#8D6527] border border-[#8D6527]/20">
                {uniqueCoupons.length} كوبون
              </span>
            </div>
            <p className="text-xs text-[#685D52] m-0 mt-0.5">
              أنشئي رموز ترويجية بنسبة مئوية أو مبالغ ثابتة مع تحكم كامل بالتعديل والحذف وتحديد فترات الصلاحية.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8D6527] to-[#704F1E] hover:from-[#A77933] hover:to-[#8D6527] active:scale-[0.98] text-white text-xs font-bold px-5 py-2.5 shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة كوبون جديد</span>
        </button>
      </div>

      {/* Coupons Table / Cards */}
      {uniqueCoupons.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-[#EADBCE] bg-[#FAF7F2]/60">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#EADBCE] text-[#C59B4B] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Ticket className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#221811] mb-1">لا توجد كوبونات خصم حالياً</h4>
          <p className="text-xs text-[#685D52] max-w-sm mx-auto mb-4">
            ابدأي بإضافة أول كوبون ترويجي لمكافأة زبائنكِ وزيادة مبيعات متجر الهدى.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-5 py-2.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول كوبون</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#685D52] border-b border-[#EADBCE] select-none">
                <tr>
                  <th className="p-4 font-bold">كود الكوبون</th>
                  <th className="p-4 font-bold">نوع الخصم</th>
                  <th className="p-4 font-bold">القيمة</th>
                  <th className="p-4 font-bold">فترة الصلاحية</th>
                  <th className="p-4 font-bold">مرات الاستخدام</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 text-center font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF7F2]">
                {uniqueCoupons.map(c => {
                  const isExpired = new Date(c.endDate) < now
                  const isUpcoming = new Date(c.startDate) > now
                  const isActive = c.isActive !== false && !isExpired && !isUpcoming
                  const isDisabled = c.isActive === false

                  return (
                    <tr key={c.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 font-mono font-bold text-xs bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] px-3 py-1.5 rounded-xl tracking-wider">
                            <Ticket className="w-3.5 h-3.5 text-[#C59B4B]" />
                            {c.code}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-[#685D52]">
                          {c.type === 'percentage' ? (
                            <>
                              <Percent className="w-3.5 h-3.5 text-[#8D6527]" />
                              <span>نسبة مئوية</span>
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5 text-[#8D6527]" />
                              <span>مبلغ ثابت</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#221811]">
                        {c.type === 'percentage' ? `${c.value}%` : `${c.value} ₪`}
                      </td>
                      <td className="p-4 text-[#685D52]">
                        <div className="flex flex-col text-[11px] gap-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#968B7E]" />
                            من: {c.startDate}
                          </span>
                          <span className="flex items-center gap-1 text-[#221811]">
                            إلى: {c.endDate}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-[#685D52]">
                        <span className="font-bold text-[#221811]">{c.usedCount || 0}</span>
                        {c.usageLimit ? (
                          <span className="text-[#968B7E] text-[11px]"> / {c.usageLimit}</span>
                        ) : (
                          <span className="text-[#968B7E] text-[11px]"> (غير محدود)</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isDisabled ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                            title="انقري للتفعيل"
                          >
                            معطّل (اضغطي للتفعيل)
                          </button>
                        ) : isActive ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                            title="انقري للتعطيل"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ساري المفعول
                          </button>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                            منتهي الصلاحية
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            يبدأ قريباً
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="w-8 h-8 rounded-xl border border-[#EADBCE] inline-flex items-center justify-center text-[#685D52] hover:text-[#8D6527] hover:border-[#8D6527] hover:bg-[#FAF7F2] transition-all cursor-pointer"
                            title="تعديل بيانات الكوبون"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button with Custom Confirm */}
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ id: c.id, code: c.code })}
                            className="w-8 h-8 rounded-xl border border-[#EADBCE] inline-flex items-center justify-center text-[#968B7E] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                            title="حذف الكوبون"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Add / Edit Coupon */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} size="sm" className="rounded-3xl overflow-hidden p-0 border border-[#EADBCE]">
          <div className="bg-white">
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-[#FAF7F2] to-white p-6 border-b border-[#EADBCE] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center border border-[#8D6527]/20">
                  {editingCoupon ? <Edit3 className="w-5 h-5 text-[#8D6527]" /> : <Ticket className="w-5 h-5 text-[#8D6527]" />}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                    {editingCoupon ? `تعديل الكوبون «${editingCoupon.code}»` : 'إضافة كوبون خصم جديد'}
                  </h3>
                  <p className="text-xs text-[#685D52] m-0 mt-0.5">
                    {editingCoupon ? 'تعديل قيمة الكوبون أو فترة الصلاحية' : 'حددي تفاصيل الخصم وتاريخ الصلاحية'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#8D6527]" />
                  <span>كود الكوبون (الرمز الترويجي) *</span>
                </label>
                <input
                  required
                  autoFocus
                  placeholder="مثال: EID2026 أو HUDA10"
                  value={draft.code}
                  onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#221811] uppercase tracking-wider outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                />
              </div>

              {/* Type and Value with Custom SelectMenu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8D6527]" />
                    <span>نوع الخصم *</span>
                  </label>
                  <SelectMenu
                    value={draft.type}
                    options={typeOptions}
                    onChange={val => setDraft({ ...draft, type: val as 'percentage' | 'fixed' })}
                    variant="admin"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    {draft.type === 'percentage' ? 'نسبة الخصم (%) *' : 'قيمة الخصم (₪) *'}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={draft.type === 'percentage' ? '100' : '9999'}
                    placeholder={draft.type === 'percentage' ? 'مثال: 15' : 'مثال: 50'}
                    value={draft.value}
                    onChange={e => setDraft({ ...draft, value: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8D6527]" />
                    <span>تاريخ البداية *</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={draft.startDate}
                    onChange={e => setDraft({ ...draft, startDate: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8D6527]" />
                    <span>تاريخ الانتهاء *</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={draft.endDate}
                    onChange={e => setDraft({ ...draft, endDate: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Usage Limit & Active switch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    حد الاستخدام (اختياري)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="غير محدود"
                    value={draft.usageLimit}
                    onChange={e => setDraft({ ...draft, usageLimit: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    حالة الكوبون
                  </label>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      draft.isActive
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-stone-100 border-stone-200 text-stone-600'
                    }`}
                  >
                    <span>{draft.isActive ? 'مفعّل ونشط' : 'معطّل مؤقتاً'}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${draft.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#EADBCE] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#8D6527] hover:bg-[#704F1E] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'جارٍ الحفظ...' : editingCoupon ? 'حفظ التعديلات' : 'حفظ الكوبون'}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Custom Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="تأكيد حذف الكوبون"
        message={`هل أنتِ متأكدة من حذف الكوبون «${confirmDelete?.code}» نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف الكوبون"
        cancelText="إلغاء وتراجع"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
