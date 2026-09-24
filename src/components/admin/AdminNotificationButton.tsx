import { useState } from 'react'
import { Bell, BellRing, Volume2 } from 'lucide-react'
import { areAdminNotificationsEnabled, disableAdminNotifications, enableAdminNotifications } from '../../utils/adminNotifications'

export default function AdminNotificationButton() {
  const [enabled, setEnabled] = useState(areAdminNotificationsEnabled)
  const [busy, setBusy] = useState(false)

  async function toggleNotifications() {
    if (busy) return
    if (enabled) {
      disableAdminNotifications()
      setEnabled(false)
      return
    }

    setBusy(true)
    try {
      const result = await enableAdminNotifications()
      if (!result.browserNotifications && !result.sound) {
        disableAdminNotifications()
        setEnabled(false)
        return
      }
      setEnabled(true)
    } finally {
      setBusy(false)
    }
  }

  const Icon = enabled ? BellRing : Bell
  const label = enabled ? 'تعطيل تنبيه الطلبات' : 'تفعيل تنبيه الطلبات'

  return (
    <button
      type="button"
      onClick={() => void toggleNotifications()}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-colors disabled:opacity-60 ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-[#EADBCE] bg-[#FAF7F2] text-[#8D6527] hover:border-[#C59B4B]'
      }`}
      title={enabled ? `${label} (الصوت مفعّل)` : `${label} (سيطلب إذن المتصفح)`}
      aria-label={label}
    >
      <Icon className={`w-4 h-4 ${enabled ? 'animate-pulse' : ''}`} />
      <span className="hidden sm:inline">{enabled ? 'التنبيهات مفعّلة' : 'تفعيل التنبيهات'}</span>
      {enabled && <Volume2 className="hidden sm:block w-3.5 h-3.5" />}
    </button>
  )
}
