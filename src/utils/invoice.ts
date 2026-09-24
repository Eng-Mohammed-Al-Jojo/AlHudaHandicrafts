import type { Order, SiteSettings } from '../types'

export function formatInvoiceIls(value: number) {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₪`
}

export function getOrderLocation(order: Order) {
  return [order.governorate, order.city].filter(Boolean).join('، ') || order.address || ''
}

export function getInvoiceShippingStatus(order: Order): 'free' | 'standard' {
  if (order.shippingStatus === 'free' || order.shippingStatus === 'standard') return order.shippingStatus
  return order.notes?.includes('شحن مجاني') ? 'free' : 'standard'
}

export function getInvoiceWhatsAppNumber(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `972${digits.slice(1)}`
  return digits
}

function formatInvoiceDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatInvoiceDisplayCurrency(order: Order) {
  if (!order.displayCurrency || order.displayCurrency === 'ILS' || typeof order.displayTotal !== 'number' || !Number.isFinite(order.displayTotal)) return ''
  const amount = order.displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const rate = typeof order.displayRate === 'number' && Number.isFinite(order.displayRate) && order.displayRate > 0
    ? ` — 1 ${order.displayCurrency} = ${order.displayRate} ₪`
    : ''
  return `${amount} ${order.displayCurrency} وقت الطلب${rate}`
}

export function buildInvoiceText(order: Order, settings: SiteSettings) {
  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`
  const itemLines = order.items.map(item => {
    const quantity = item.quantity ?? 1
    return `- ${item.productName} × ${quantity} — ${formatInvoiceIls(item.price * quantity)}`
  }).join('\n')
  const shippingStatus = getInvoiceShippingStatus(order)
  const location = [order.governorate, order.city, order.address].filter(Boolean).join('، ')

  return [
    `فاتورة ${settings.storeName}`,
    `رقم الفاتورة: ${invoiceNumber}`,
    `رقم الطلب: #${order.id.slice(0, 8)}`,
    `التاريخ: ${formatInvoiceDate(order.createdAt)}`,
    '',
    'بيانات العميلة:',
    `الاسم: ${order.customer}`,
    `الجوال: ${order.phone ?? ''}`,
    ...(order.email ? [`البريد الإلكتروني: ${order.email}`] : []),
    ...(location ? [`العنوان: ${location}`] : []),
    '',
    'المنتجات:',
    itemLines || 'لا توجد منتجات',
    '',
    `الإجمالي الأساسي: ${formatInvoiceIls(order.total)}`,
    ...(formatInvoiceDisplayCurrency(order) ? [formatInvoiceDisplayCurrency(order)] : []),
    `الشحن: ${shippingStatus === 'free' ? 'مجاني' : 'عادي — يتم التنسيق مع العميلة'}`,
    ...(order.shippingThreshold !== undefined ? [`حد الشحن المجاني: ${formatInvoiceIls(order.shippingThreshold)}`] : []),
    ...(order.deliveryNotes ? [`ملاحظات التوصيل: ${order.deliveryNotes}`] : []),
    ...(order.notes ? [`ملاحظات: ${order.notes}`] : []),
  ].join('\n')
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function buildInvoiceHtml(order: Order, settings: SiteSettings) {
  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`
  const location = [order.governorate, order.city, order.address].filter(Boolean).join('، ')
  const shippingStatus = getInvoiceShippingStatus(order)
  const rows = order.items.length > 0
    ? order.items.map(item => {
      const quantity = item.quantity ?? 1
      return `<tr><td>${escapeHtml(item.productName)}</td><td>× ${quantity}</td><td>${escapeHtml(formatInvoiceIls(item.price))}</td><td>${escapeHtml(formatInvoiceIls(item.price * quantity))}</td></tr>`
    }).join('')
    : '<tr><td colspan="4" class="empty">لا توجد منتجات</td></tr>'
  const displayCurrency = formatInvoiceDisplayCurrency(order)

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>فاتورة ${escapeHtml(invoiceNumber)}</title>
<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #221811; background: #fff; font-family: Tahoma, Arial, sans-serif; font-size: 12px; }
.invoice { border: 1px solid #EADBCE; padding: 24px; }
.header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #8D6527; padding-bottom: 18px; }
.store { font-size: 22px; font-weight: bold; color: #8D6527; }
.muted { color: #685D52; line-height: 1.8; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; }
.box { background: #FAF7F2; border: 1px solid #EADBCE; padding: 12px; line-height: 1.9; }
.box strong { display: block; margin-bottom: 4px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th { background: #24180E; color: #F7F1E5; padding: 10px; text-align: right; }
td { border-bottom: 1px solid #EADBCE; padding: 10px; text-align: right; }
.empty { text-align: center; color: #968B7E; }
.totals { width: 280px; margin: 18px 0 0 auto; line-height: 2; }
.total { border-top: 2px solid #8D6527; font-size: 15px; font-weight: bold; color: #8D6527; }
.notes { margin-top: 18px; background: #FFFCF8; border: 1px solid #EADBCE; padding: 12px; line-height: 1.9; }
.footer { text-align: center; color: #968B7E; font-size: 10px; margin-top: 20px; }
@media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style></head><body><main class="invoice">
<header class="header"><div><div class="store">فاتورة مبيعات — ${escapeHtml(settings.storeName)}</div><div class="muted">${escapeHtml(settings.address)}</div><div class="muted" dir="ltr">${escapeHtml(settings.phone)}</div></div><div class="muted"><div>رقم الفاتورة</div><strong>${escapeHtml(invoiceNumber)}</strong><div style="margin-top:8px">التاريخ</div><strong>${escapeHtml(formatInvoiceDate(order.createdAt))}</strong></div></header>
<section class="info-grid"><div class="box"><strong>بيانات العميلة</strong><div>الاسم: ${escapeHtml(order.customer)}</div><div>الجوال: ${escapeHtml(order.phone || '—')}</div>${order.email ? `<div dir="ltr">${escapeHtml(order.email)}</div>` : ''}${location ? `<div>العنوان: ${escapeHtml(location)}</div>` : ''}</div><div class="box"><strong>بيانات الطلب</strong><div>الحالة: ${escapeHtml(order.status)}</div><div>عدد القطع: ${order.itemsCount}</div><div>الشحن: ${shippingStatus === 'free' ? 'مجاني' : 'عادي — يتم التنسيق'}</div>${order.shippingThreshold !== undefined ? `<div>حد الشحن المجاني: ${escapeHtml(formatInvoiceIls(order.shippingThreshold))}</div>` : ''}</div></section>
<table><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
<section class="totals"><div>المجموع الأساسي: <strong>${escapeHtml(formatInvoiceIls(order.total))}</strong></div>${displayCurrency ? `<div>${escapeHtml(displayCurrency)}</div>` : ''}<div>الشحن: <strong>${shippingStatus === 'free' ? 'مجاني' : 'يُنسق مع العميلة'}</strong></div><div class="total">الإجمالي: ${escapeHtml(formatInvoiceIls(order.total))}</div></section>
${(order.deliveryNotes || order.notes) ? `<section class="notes"><strong>ملاحظات</strong>${order.deliveryNotes ? `<div>التوصيل: ${escapeHtml(order.deliveryNotes)}</div>` : ''}${order.notes ? `<div>التطريز: ${escapeHtml(order.notes)}</div>` : ''}</section>` : ''}
<div class="footer">شكراً لثقتك بمتجر ${escapeHtml(settings.storeName)} — الفاتورة الأساسية محفوظة بالشيكل.</div>
</main><script>window.onload = () => setTimeout(() => window.print(), 250);</script></body></html>`
}

type CanvasContext = CanvasRenderingContext2D

function setCanvasFont(ctx: CanvasContext, size: number, weight = 'normal') {
  ctx.font = `${weight} ${size}px Tahoma, Arial, sans-serif`
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
}

function wrapCanvasText(ctx: CanvasContext, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !current) current = candidate
    else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

function drawCanvasLines(ctx: CanvasContext, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 4) {
  const lines = wrapCanvasText(ctx, text, maxWidth).slice(0, maxLines)
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return y + lines.length * lineHeight
}

export async function createInvoiceImage(order: Order, settings: SiteSettings): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('Invoice image can only be created in a browser.')
  const canvas = document.createElement('canvas')
  const width = 1400
  const padding = 70
  const context = canvas.getContext('2d')
  if (!context) throw new Error('تعذر تجهيز مساحة الفاتورة.')

  setCanvasFont(context, 22, 'bold')
  const productLayouts = order.items.map(item => {
    const quantity = item.quantity ?? 1
    return { item, quantity, lines: wrapCanvasText(context, item.productName, 620) }
  })
  const rowsHeight = productLayouts.reduce((sum, row) => sum + Math.max(64, row.lines.length * 25 + 24), 0)
  const notesText = [order.deliveryNotes, order.notes].filter(Boolean).join('\n')
  const notesLines = notesText ? wrapCanvasText(context, notesText.replaceAll('\n', ' '), width - padding * 2 - 40) : []
  const height = Math.max(1300, 720 + rowsHeight + (notesLines.length ? 100 + notesLines.length * 25 : 0))
  canvas.width = width
  canvas.height = height
  const ctx = context
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.direction = 'rtl'

  ctx.fillStyle = '#24180E'
  ctx.fillRect(0, 0, width, 190)
  setCanvasFont(ctx, 22, 'bold')
  ctx.fillStyle = '#DFB76C'
  ctx.fillText(`فاتورة مبيعات — ${settings.storeName}`, width - padding, 66)
  setCanvasFont(ctx, 16)
  ctx.fillStyle = '#F7F1E5'
  ctx.fillText(`رقم الفاتورة: INV-${order.id.slice(0, 8).toUpperCase()}`, width - padding, 110)
  ctx.fillText(`رقم الطلب: #${order.id.slice(0, 8)}`, width - padding, 140)
  ctx.fillText(`التاريخ: ${formatInvoiceDate(order.createdAt)}`, width - padding, 170)
  if (settings.address) drawCanvasLines(ctx, settings.address, width - padding, 220, 500, 24, 2)

  let y = 300
  ctx.fillStyle = '#FAF7F2'
  ctx.fillRect(padding, y, (width - padding * 2) / 2 - 10, 150)
  ctx.fillRect(width / 2 + 10, y, (width - padding * 2) / 2 - 10, 150)
  setCanvasFont(ctx, 18, 'bold')
  ctx.fillStyle = '#221811'
  ctx.fillText('بيانات العميلة', width - padding - 20, y + 32)
  ctx.fillText('بيانات الطلب', width / 2 + 30, y + 32)
  setCanvasFont(ctx, 15)
  const location = [order.governorate, order.city, order.address].filter(Boolean).join('، ')
  drawCanvasLines(ctx, `الاسم: ${order.customer}\nالجوال: ${order.phone || '—'}${order.email ? `\nالبريد: ${order.email}` : ''}${location ? `\nالعنوان: ${location}` : ''}`, width - padding - 20, y + 64, 520, 25, 4)
  const shippingStatus = getInvoiceShippingStatus(order)
  drawCanvasLines(ctx, `الحالة: ${order.status}\nعدد القطع: ${order.itemsCount}\nالشحن: ${shippingStatus === 'free' ? 'مجاني' : 'عادي — يتم التنسيق'}${order.shippingThreshold !== undefined ? `\nحد الشحن المجاني: ${formatInvoiceIls(order.shippingThreshold)}` : ''}`, width / 2 + 30, y + 64, 520, 25, 4)

  y += 190
  ctx.fillStyle = '#24180E'
  ctx.fillRect(padding, y, width - padding * 2, 52)
  setCanvasFont(ctx, 16, 'bold')
  ctx.fillStyle = '#F7F1E5'
  ctx.fillText('المنتج', width - padding - 20, y + 33)
  ctx.textAlign = 'center'
  ctx.fillText('الكمية', width - 770, y + 33)
  ctx.fillText('سعر الوحدة', width - 540, y + 33)
  ctx.fillText('الإجمالي', width - 280, y + 33)
  ctx.textAlign = 'right'
  y += 52

  for (const [index, row] of productLayouts.entries()) {
    const rowHeight = Math.max(64, row.lines.length * 25 + 24)
    ctx.fillStyle = index % 2 === 0 ? '#FFFFFF' : '#FAF7F2'
    ctx.fillRect(padding, y, width - padding * 2, rowHeight)
    setCanvasFont(ctx, 15)
    ctx.fillStyle = '#221811'
    drawCanvasLines(ctx, row.item.productName, width - padding - 20, y + 27, 620, 25, 4)
    ctx.textAlign = 'center'
    ctx.fillText(`× ${row.quantity}`, width - 770, y + 28)
    ctx.fillText(formatInvoiceIls(row.item.price), width - 540, y + 28)
    ctx.fillText(formatInvoiceIls(row.item.price * row.quantity), width - 280, y + 28)
    ctx.textAlign = 'right'
    ctx.strokeStyle = '#EADBCE'
    ctx.beginPath()
    ctx.moveTo(padding, y + rowHeight)
    ctx.lineTo(width - padding, y + rowHeight)
    ctx.stroke()
    y += rowHeight
  }

  y += 30
  setCanvasFont(ctx, 17, 'bold')
  ctx.fillStyle = '#221811'
  const totalsX = width - padding
  ctx.fillText(`المجموع الأساسي: ${formatInvoiceIls(order.total)}`, totalsX, y)
  y += 30
  const displayCurrency = formatInvoiceDisplayCurrency(order)
  if (displayCurrency) {
    ctx.fillStyle = '#8D6527'
    ctx.fillText(displayCurrency, totalsX, y)
    y += 30
  }
  ctx.fillStyle = '#221811'
  ctx.fillText(`الشحن: ${shippingStatus === 'free' ? 'مجاني' : 'يُنسق مع العميلة'}`, totalsX, y)
  y += 38
  ctx.strokeStyle = '#8D6527'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(width - padding - 420, y - 26)
  ctx.lineTo(totalsX, y - 26)
  ctx.stroke()
  setCanvasFont(ctx, 21, 'bold')
  ctx.fillStyle = '#8D6527'
  ctx.fillText(`الإجمالي: ${formatInvoiceIls(order.total)}`, totalsX, y)

  if (notesLines.length > 0) {
    y += 38
    ctx.fillStyle = '#FFFCF8'
    ctx.fillRect(padding, y - 20, width - padding * 2, 70 + notesLines.length * 25)
    setCanvasFont(ctx, 16, 'bold')
    ctx.fillStyle = '#221811'
    ctx.fillText('ملاحظات', width - padding - 20, y + 8)
    setCanvasFont(ctx, 14)
    ctx.fillStyle = '#685D52'
    drawCanvasLines(ctx, notesText.replaceAll('\n', ' '), width - padding - 20, y + 36, width - padding * 2 - 40, 25, 5)
  }

  setCanvasFont(ctx, 13)
  ctx.fillStyle = '#968B7E'
  ctx.textAlign = 'center'
  ctx.fillText(`شكراً لثقتك بمتجر ${settings.storeName} — الفاتورة الأساسية محفوظة بالشيكل.`, width / 2, height - 35)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر إنشاء صورة الفاتورة.')), 'image/png')
  })
}

export function downloadInvoiceImage(blob: Blob, order: Order) {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `invoice-${order.id.slice(0, 8)}.png`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function printInvoice(order: Order, settings: SiteSettings) {
  if (typeof window === 'undefined') return false
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false
  printWindow.opener = null
  printWindow.document.open()
  printWindow.document.write(buildInvoiceHtml(order, settings))
  printWindow.document.close()
  return true
}
