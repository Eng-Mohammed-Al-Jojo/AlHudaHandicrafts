import type { Invoice, InvoiceItem, InvoiceType, SiteSettings } from '../types'
import { normalizeWhatsAppNumber, whatsappLink } from './whatsapp'

export function invoiceTypeLabel(type: InvoiceType) {
  return type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'
}

export function formatMoney(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₪`
}

export function invoiceLineSubtotal(item: InvoiceItem) {
  return Math.max(0, (Number(item.price) || 0) * (Number(item.quantity) || 0))
}

export function invoiceLineDiscount(item: InvoiceItem) {
  return Math.min(Math.max(0, Number(item.discount) || 0), invoiceLineSubtotal(item))
}

export function invoiceLineTotal(item: InvoiceItem) {
  return invoiceLineSubtotal(item) - invoiceLineDiscount(item)
}

export function calculateInvoiceTotals(invoice: Pick<Invoice, 'items' | 'extraDiscount'>) {
  const subtotal = invoice.items.reduce((sum, item) => sum + invoiceLineSubtotal(item), 0)
  const itemsDiscount = invoice.items.reduce((sum, item) => sum + invoiceLineDiscount(item), 0)
  const afterItems = Math.max(0, subtotal - itemsDiscount)
  const extraDiscount = Math.min(Math.max(0, Number(invoice.extraDiscount) || 0), afterItems)
  const total = Math.max(0, afterItems - extraDiscount)
  const itemsCount = invoice.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  return {
    subtotal,
    itemsDiscount,
    extraDiscount,
    discountTotal: itemsDiscount + extraDiscount,
    total,
    itemsCount,
  }
}

/** Produce the next sequential invoice number for the current year and type. */
export function nextInvoiceNumber(invoices: Invoice[], type: InvoiceType, date = new Date()) {
  const prefix = type === 'sale' ? 'INV' : 'PUR'
  const year = date.getFullYear()
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`)
  const max = invoices.reduce((current, invoice) => {
    const match = invoice.invoiceNumber?.match(pattern)
    if (!match) return current
    return Math.max(current, Number(match[1]) || 0)
  }, 0)
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`
}

export function invoiceDateLabel(value?: string) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return value || '—'
  return date.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/** Build the branded, printable invoice document. */
export function buildManualInvoiceHtml(invoice: Invoice, settings: SiteSettings, options: { autoPrint?: boolean } = {}) {
  const totals = calculateInvoiceTotals(invoice)
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.jpeg` : '/logo.jpeg'
  const rows = invoice.items.length > 0
    ? invoice.items.map((item, index) => `
        <tr>
          <td class="num">${index + 1}</td>
          <td>
            <span class="item-name">${escapeHtml(item.name || 'صنف')}</span>
            ${item.productId ? '<span class="item-tag">من المتجر</span>' : ''}
          </td>
          <td class="center">${item.quantity}</td>
          <td class="center">${escapeHtml(formatMoney(item.price))}</td>
          <td class="center discount">${invoiceLineDiscount(item) > 0 ? `− ${escapeHtml(formatMoney(invoiceLineDiscount(item)))}` : '—'}</td>
          <td class="center strong">${escapeHtml(formatMoney(invoiceLineTotal(item)))}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="empty">لا توجد أصناف في هذه الفاتورة</td></tr>'

  const signature = invoice.signature
  const hasSignature = Boolean(signature?.drawing || signature?.image)
  const signatureHtml = hasSignature
    ? `<section class="signatures">
        <div class="signature-title">التوقيع والاعتماد</div>
        <div class="signature-grid">
          ${signature?.drawing ? `<div class="signature-box"><img src="${signature.drawing}" alt="التوقيع" /><span>التوقيع</span></div>` : ''}
          ${signature?.image ? `<div class="signature-box"><img src="${signature.image}" alt="الختم" /><span>${signature?.drawing ? 'الختم / التوقيع المرفوع' : 'التوقيع المرفوع'}</span></div>` : ''}
        </div>
      </section>`
    : `<section class="signatures"><div class="signature-title">التوقيع والاعتماد</div><div class="signature-grid"><div class="signature-box signature-empty"><span>التوقيع</span></div></div></section>`

  const contactLine = [settings.phone, settings.email].filter(Boolean).map(value => escapeHtml(value)).join(' · ')

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(invoice.invoiceNumber)} — ${escapeHtml(settings.storeName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #221811; font-family: "Cairo", Tahoma, Arial, sans-serif; font-size: 12px; }
  .invoice { max-width: 820px; margin: 0 auto; border: 1px solid #EADBCE; overflow: hidden; }
  .brand { background: linear-gradient(135deg, #1E1712 0%, #2A1D15 55%, #1E1712 100%); color: #fff; padding: 24px 28px; display: flex; justify-content: space-between; gap: 20px; align-items: center; border-bottom: 4px solid #C59B4B; }
  .brand-main { display: flex; align-items: center; gap: 16px; }
  .logo { width: 64px; height: 64px; border-radius: 16px; object-fit: cover; background: #fff; border: 2px solid #DFB76C; }
  .store-name { font-family: "Amiri", "Times New Roman", serif; font-size: 27px; color: #DFB76C; line-height: 1.2; }
  .store-tag { color: rgba(255,255,255,.65); font-size: 10.5px; margin-top: 3px; letter-spacing: .3px; }
  .brand-meta { text-align: left; font-size: 11px; color: rgba(255,255,255,.8); min-width: 190px; }
  .brand-meta .inv-no { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 2px; direction: ltr; }
  .type-pill { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 999px; background: rgba(197,155,75,.2); border: 1px solid rgba(223,183,108,.55); color: #DFB76C; font-size: 10px; font-weight: 700; }
  .body { padding: 26px 28px 20px; }
  .info-grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 14px; margin-bottom: 22px; }
  .panel { background: #FAF7F2; border: 1px solid #EADBCE; border-radius: 12px; padding: 14px 16px; line-height: 2; }
  .panel strong { display: block; color: #8D6527; font-size: 11px; margin-bottom: 6px; letter-spacing: .3px; }
  .panel .label { color: #968B7E; display: inline-block; min-width: 82px; }
  .panel .value { color: #221811; font-weight: 600; }
  .panel .address { display: block; margin-top: 4px; color: #685D52; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #24180E; color: #F7F1E5; padding: 11px 8px; text-align: right; font-size: 10.5px; font-weight: 700; letter-spacing: .2px; }
  thead th:first-child { border-radius: 10px 0 0 0; }
  thead th:last-child { border-radius: 0 10px 0 0; }
  tbody td { border-bottom: 1px solid #F1E8DD; padding: 10px 8px; vertical-align: middle; }
  tbody tr:nth-child(even) { background: #FDFBF8; }
  .num { color: #B4A898; width: 34px; text-align: center; }
  .center { text-align: center; }
  .item-name { font-weight: 600; color: #221811; }
  .item-tag { display: inline-block; margin-inline-start: 6px; font-size: 8.5px; color: #8D6527; background: #F5EBDC; border-radius: 999px; padding: 1px 7px; }
  .discount { color: #B91C1C; }
  .strong { font-weight: 700; color: #8D6527; }
  .empty { text-align: center; color: #968B7E; padding: 24px; }
  .bottom-grid { display: grid; grid-template-columns: 1fr 300px; gap: 18px; margin-top: 20px; align-items: start; }
  .notes { background: #FFFCF8; border: 1px dashed #EADBCE; border-radius: 12px; padding: 12px 14px; color: #685D52; line-height: 1.9; font-size: 11px; }
  .notes strong { display: block; color: #8D6527; margin-bottom: 4px; }
  .totals { background: #FAF7F2; border: 1px solid #EADBCE; border-radius: 12px; padding: 14px 16px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; color: #685D52; }
  .totals .row.discount { color: #B91C1C; }
  .totals .grand { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #C59B4B; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 700; color: #8D6527; }
  .signatures { margin-top: 26px; border-top: 1px solid #EADBCE; padding-top: 14px; }
  .signature-title { color: #8D6527; font-size: 11px; font-weight: 700; margin-bottom: 10px; }
  .signature-grid { display: flex; gap: 14px; flex-wrap: wrap; }
  .signature-box { flex: 1; min-width: 220px; border: 1px dashed #D9C7B2; border-radius: 12px; padding: 8px; text-align: center; background: #FFFEFA; }
  .signature-box img { display: block; max-height: 96px; max-width: 100%; margin: 0 auto 4px; object-fit: contain; }
  .signature-box span { display: block; font-size: 10px; color: #968B7E; }
  .signature-empty { min-height: 80px; display: flex; align-items: flex-end; justify-content: center; }
  .footer { margin-top: 22px; border-top: 1px solid #EADBCE; padding-top: 12px; text-align: center; color: #968B7E; font-size: 10px; line-height: 1.9; }
  .footer .thanks { color: #8D6527; font-weight: 700; font-size: 11px; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .invoice { border: none; } }
</style></head>
<body>
<main class="invoice">
  <header class="brand">
    <div class="brand-main">
      <img class="logo" src="${logoUrl}" alt="${escapeHtml(settings.storeName)}" />
      <div>
        <div class="store-name">${escapeHtml(settings.storeName)}</div>
        <div class="store-tag">التطريز الفاخر · تصاميم تُروى بالخيوط</div>
        ${settings.address ? `<div class="store-tag">${escapeHtml(settings.address)}</div>` : ''}
      </div>
    </div>
    <div class="brand-meta">
      <div class="inv-no">${escapeHtml(invoice.invoiceNumber)}</div>
      <div>${escapeHtml(invoiceDateLabel(invoice.createdAt))}</div>
      <div class="type-pill">${escapeHtml(invoiceTypeLabel(invoice.type))}</div>
    </div>
  </header>

  <div class="body">
    <section class="info-grid">
      <div class="panel">
        <strong>بيانات الزبون</strong>
        <div><span class="label">الاسم:</span> <span class="value">${escapeHtml(invoice.customerName || '—')}</span></div>
        <div><span class="label">واتساب:</span> <span class="value" dir="ltr">${escapeHtml(invoice.customerPhone ? `+${normalizeWhatsAppNumber(invoice.customerPhone)}` : '—')}</span></div>
        ${invoice.deliveryAddress ? `<span class="address">مكان التوصيل: ${escapeHtml(invoice.deliveryAddress)}</span>` : ''}
      </div>
      <div class="panel">
        <strong>ملخص الفاتورة</strong>
        <div><span class="label">عدد الأصناف:</span> <span class="value">${invoice.items.length}</span></div>
        <div><span class="label">عدد القطع:</span> <span class="value">${totals.itemsCount}</span></div>
        <div><span class="label">النوع:</span> <span class="value">${escapeHtml(invoiceTypeLabel(invoice.type))}</span></div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>الصنف</th>
          <th class="center">الكمية</th>
          <th class="center">السعر</th>
          <th class="center">خصم الصنف</th>
          <th class="center">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="bottom-grid">
      <div class="notes">
        <strong>ملاحظات</strong>
        ${invoice.notes ? escapeHtml(invoice.notes) : 'شكراً لثقتك بنا. يُرجى مراجعة الفاتورة والتواصل معنا لأي استفسار.'}
      </div>
      <div class="totals">
        <div class="row"><span>المجموع</span><span>${escapeHtml(formatMoney(totals.subtotal))}</span></div>
        ${totals.itemsDiscount > 0 ? `<div class="row discount"><span>خصم الأصناف</span><span>− ${escapeHtml(formatMoney(totals.itemsDiscount))}</span></div>` : ''}
        ${totals.extraDiscount > 0 ? `<div class="row discount"><span>خصم إضافي</span><span>− ${escapeHtml(formatMoney(totals.extraDiscount))}</span></div>` : ''}
        <div class="grand"><span>الإجمالي النهائي</span><span>${escapeHtml(formatMoney(totals.total))}</span></div>
      </div>
    </section>

    ${signatureHtml}

    <footer class="footer">
      <div class="thanks">شكراً لثقتك بمتجر ${escapeHtml(settings.storeName)}</div>
      <div>${contactLine}${settings.whatsappNumber ? `${contactLine ? ' · ' : ''}واتساب: <span dir="ltr">+${escapeHtml(normalizeWhatsAppNumber(settings.whatsappNumber))}</span>` : ''}</div>
      <div>هذه الفاتورة صادرة إلكترونياً من لوحة الهدى.</div>
    </footer>
  </div>
</main>
${options.autoPrint ? '<script>window.onload = () => setTimeout(() => window.print(), 500);</script>' : ''}
</body></html>`
}

/** Open a print-ready window for a manual invoice. */
export function printManualInvoice(invoice: Invoice, settings: SiteSettings) {
  if (typeof window === 'undefined') return false
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false
  printWindow.opener = null
  printWindow.document.open()
  printWindow.document.write(buildManualInvoiceHtml(invoice, settings, { autoPrint: true }))
  printWindow.document.close()
  return true
}

/** WhatsApp share text for a manual invoice. */
export function buildInvoiceShareText(invoice: Invoice, settings: SiteSettings) {
  const totals = calculateInvoiceTotals(invoice)
  const lines = invoice.items.map(item => `- ${item.name} × ${item.quantity}: ${formatMoney(invoiceLineTotal(item))}`)
  return [
    `${invoiceTypeLabel(invoice.type)} — ${settings.storeName}`,
    `رقم الفاتورة: ${invoice.invoiceNumber}`,
    `الاسم: ${invoice.customerName}`,
    ...(invoice.deliveryAddress ? [`مكان التوصيل: ${invoice.deliveryAddress}`] : []),
    '',
    ...lines,
    '',
    `المجموع: ${formatMoney(totals.subtotal)}`,
    ...(totals.discountTotal > 0 ? [`إجمالي الخصم: − ${formatMoney(totals.discountTotal)}`] : []),
    `الإجمالي النهائي: ${formatMoney(totals.total)}`,
    ...(invoice.notes ? ['', `ملاحظات: ${invoice.notes}`] : []),
    '',
    `شكراً لثقتك بمتجر ${settings.storeName} 🌿`,
  ].join('\n')
}

export function invoiceWhatsAppLink(invoice: Invoice) {
  const digits = normalizeWhatsAppNumber(invoice.customerPhone)
  if (!digits) return ''
  return whatsappLink(digits)
}

// ─── Invoice image (PNG) ─────────────────────────────────────────────────────

const IMAGE_WIDTH = 1400
const IMAGE_PADDING = 70
const IMAGE_CONTENT_WIDTH = IMAGE_WIDTH - IMAGE_PADDING * 2

type CanvasContext = CanvasRenderingContext2D

function setImageFont(ctx: CanvasContext, size: number, weight = 'normal') {
  ctx.font = `${weight} ${size}px Tahoma, "Segoe UI", Arial, sans-serif`
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
}

function wrapImageText(ctx: CanvasContext, text: string, maxWidth: number) {
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

function roundedRect(ctx: CanvasContext, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function loadImageSafe(src?: string): Promise<HTMLImageElement | null> {
  if (!src || typeof Image === 'undefined') return Promise.resolve(null)
  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function drawContainedImage(ctx: CanvasContext, image: HTMLImageElement, x: number, y: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
  const width = image.width * scale
  const height = image.height * scale
  ctx.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height)
}

function drawCanvasLines(ctx: CanvasContext, lines: string[], x: number, y: number, lineHeight: number, maxLines = 4) {
  lines.slice(0, maxLines).forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
}

/** Render a high-resolution PNG of the invoice, ready to send on WhatsApp. */
export async function createManualInvoiceImage(invoice: Invoice, settings: SiteSettings): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('Image creation is only available in a browser.')

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('تعذر تجهيز مساحة الفاتورة.')

  const totals = calculateInvoiceTotals(invoice)
  const signatureImages = await Promise.all([
    loadImageSafe(invoice.signature?.drawing),
    loadImageSafe(invoice.signature?.image),
  ])
  const logo = await loadImageSafe('/logo.jpeg')
  const signatures = signatureImages
    .map((image, index) => ({ image, label: index === 0 ? 'التوقيع' : 'الختم / التوقيع المرفوع' }))
    .filter((entry): entry is { image: HTMLImageElement; label: string } => Boolean(entry.image))

  // Measure text blocks before sizing the canvas.
  context.direction = 'rtl'
  setImageFont(context, 17)
  const itemLayouts = invoice.items.map(item => ({
    item,
    lines: wrapImageText(context, item.name || 'صنف', 420),
  }))
  setImageFont(context, 15)
  const notesText = invoice.notes || 'شكراً لثقتك بنا. يُرجى مراجعة الفاتورة والتواصل معنا لأي استفسار.'
  const notesLines = wrapImageText(context, notesText, IMAGE_CONTENT_WIDTH - 500 - 40)

  const rowsHeight = itemLayouts.reduce((sum, row) => sum + Math.max(66, row.lines.length * 24 + 30), 0)
  const totalsLineCount = 2 + (totals.itemsDiscount > 0 ? 1 : 0) + (totals.extraDiscount > 0 ? 1 : 0)
  const totalsHeight = 34 + totalsLineCount * 28 + 58
  const notesHeight = 56 + notesLines.length * 24
  const summaryHeight = Math.max(totalsHeight, notesHeight)
  const signatureHeight = 132

  const height = 240 + 170 + 26 + 54 + rowsHeight + 34 + summaryHeight + 34 + 34 + signatureHeight + 80

  canvas.width = IMAGE_WIDTH
  canvas.height = height
  const ctx = context
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, IMAGE_WIDTH, height)
  ctx.direction = 'rtl'

  // ── Brand header ──
  const headerGradient = ctx.createLinearGradient(0, 0, IMAGE_WIDTH, 220)
  headerGradient.addColorStop(0, '#1E1712')
  headerGradient.addColorStop(0.55, '#2A1D15')
  headerGradient.addColorStop(1, '#1E1712')
  ctx.fillStyle = headerGradient
  ctx.fillRect(0, 0, IMAGE_WIDTH, 210)
  ctx.fillStyle = '#C59B4B'
  ctx.fillRect(0, 210, IMAGE_WIDTH, 5)

  if (logo) {
    ctx.save()
    roundedRect(ctx, IMAGE_WIDTH - IMAGE_PADDING - 96, 46, 96, 96, 20)
    ctx.clip()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(IMAGE_WIDTH - IMAGE_PADDING - 96, 46, 96, 96)
    ctx.drawImage(logo, IMAGE_WIDTH - IMAGE_PADDING - 96, 46, 96, 96)
    ctx.restore()
    ctx.strokeStyle = '#DFB76C'
    ctx.lineWidth = 2
    roundedRect(ctx, IMAGE_WIDTH - IMAGE_PADDING - 96, 46, 96, 96, 20)
    ctx.stroke()
  }

  setImageFont(ctx, 36, 'bold')
  ctx.fillStyle = '#DFB76C'
  ctx.fillText(settings.storeName, IMAGE_WIDTH - IMAGE_PADDING - 118, 92)
  setImageFont(ctx, 15)
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.fillText('التطريز الفاخر · تصاميم تُروى بالخيوط', IMAGE_WIDTH - IMAGE_PADDING - 118, 124)
  if (settings.address) {
    setImageFont(ctx, 13)
    ctx.fillText(settings.address, IMAGE_WIDTH - IMAGE_PADDING - 118, 150)
  }

  // Left meta block
  setImageFont(ctx, 24, 'bold')
  ctx.textAlign = 'left'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(invoice.invoiceNumber, IMAGE_PADDING, 72)
  setImageFont(ctx, 14)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  const headerDate = new Date(invoice.createdAt)
  ctx.fillText(
    Number.isNaN(headerDate.getTime())
      ? (invoice.createdAt || '—')
      : headerDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    IMAGE_PADDING,
    108,
  )

  setImageFont(ctx, 14, 'bold')
  const pillLabel = invoiceTypeLabel(invoice.type)
  const pillWidth = ctx.measureText(pillLabel).width + 34
  roundedRect(ctx, IMAGE_PADDING, 130, pillWidth, 36, 18)
  ctx.fillStyle = 'rgba(197,155,75,0.20)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(223,183,108,0.55)'
  ctx.lineWidth = 1.5
  roundedRect(ctx, IMAGE_PADDING, 130, pillWidth, 36, 18)
  ctx.stroke()
  ctx.fillStyle = '#DFB76C'
  ctx.textAlign = 'left'
  ctx.fillText(pillLabel, IMAGE_PADDING + 17, 154)

  // ── Customer + summary panels ──
  const boxY = 240
  const boxWidth = (IMAGE_CONTENT_WIDTH - 16) / 2
  const customerBoxX = IMAGE_WIDTH - IMAGE_PADDING - boxWidth
  const summaryBoxX = IMAGE_PADDING

  for (const boxX of [customerBoxX, summaryBoxX]) {
    roundedRect(ctx, boxX, boxY, boxWidth, 170, 16)
    ctx.fillStyle = '#FAF7F2'
    ctx.fill()
    ctx.strokeStyle = '#EADBCE'
    ctx.lineWidth = 1
    roundedRect(ctx, boxX, boxY, boxWidth, 170, 16)
    ctx.stroke()
  }

  const customerRight = customerBoxX + boxWidth - 20
  setImageFont(ctx, 14, 'bold')
  ctx.fillStyle = '#8D6527'
  ctx.fillText('بيانات الزبون', customerRight, boxY + 34)
  setImageFont(ctx, 16)
  ctx.fillStyle = '#221811'
  ctx.fillText(`الاسم: ${invoice.customerName || '—'}`, customerRight, boxY + 70)
  setImageFont(ctx, 15)
  ctx.fillStyle = '#685D52'
  ctx.fillText('واتساب:', customerRight, boxY + 100)
  const phoneLabelWidth = ctx.measureText('واتساب:').width
  ctx.direction = 'ltr'
  ctx.textAlign = 'right'
  ctx.fillText(invoice.customerPhone ? `+${normalizeWhatsAppNumber(invoice.customerPhone)}` : '—', customerRight - phoneLabelWidth - 8, boxY + 100)
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  setImageFont(ctx, 14)
  const addressLines = wrapImageText(ctx, `مكان التوصيل: ${invoice.deliveryAddress || '—'}`, boxWidth - 40)
  drawCanvasLines(ctx, addressLines, customerRight, boxY + 130, 22, 2)

  const summaryRight = summaryBoxX + boxWidth - 20
  setImageFont(ctx, 14, 'bold')
  ctx.fillStyle = '#8D6527'
  ctx.fillText('ملخص الفاتورة', summaryRight, boxY + 34)
  setImageFont(ctx, 15)
  ctx.fillStyle = '#221811'
  ctx.fillText(`عدد الأصناف: ${invoice.items.length}`, summaryRight, boxY + 70)
  ctx.fillText(`عدد القطع: ${totals.itemsCount}`, summaryRight, boxY + 100)
  ctx.fillStyle = '#685D52'
  ctx.fillText(`النوع: ${invoiceTypeLabel(invoice.type)}`, summaryRight, boxY + 130)

  // ── Items table ──
  let y = boxY + 170 + 26
  ctx.fillStyle = '#24180E'
  roundedRect(ctx, IMAGE_PADDING, y, IMAGE_CONTENT_WIDTH, 54, 12)
  ctx.fill()
  setImageFont(ctx, 14, 'bold')
  ctx.fillStyle = '#F7F1E5'
  ctx.fillText('#', IMAGE_WIDTH - IMAGE_PADDING - 24, y + 34)
  ctx.fillText('الصنف', IMAGE_WIDTH - IMAGE_PADDING - 100, y + 34)
  ctx.textAlign = 'center'
  ctx.fillText('الكمية', 800, y + 34)
  ctx.fillText('السعر', 640, y + 34)
  ctx.fillText('خصم الصنف', 480, y + 34)
  ctx.fillText('الإجمالي', 240, y + 34)
  ctx.textAlign = 'right'
  y += 54

  for (const [index, row] of itemLayouts.entries()) {
    const rowHeight = Math.max(66, row.lines.length * 24 + 30)
    ctx.fillStyle = index % 2 === 0 ? '#FFFFFF' : '#FDFBF8'
    ctx.fillRect(IMAGE_PADDING, y, IMAGE_CONTENT_WIDTH, rowHeight)
    ctx.strokeStyle = '#F1E8DD'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(IMAGE_PADDING, y + rowHeight)
    ctx.lineTo(IMAGE_WIDTH - IMAGE_PADDING, y + rowHeight)
    ctx.stroke()

    setImageFont(ctx, 14, 'bold')
    ctx.fillStyle = '#221811'
    drawCanvasLines(ctx, row.lines, IMAGE_WIDTH - IMAGE_PADDING - 100, y + 28, 24, 4)

    setImageFont(ctx, 15)
    ctx.fillStyle = '#685D52'
    ctx.textAlign = 'center'
    ctx.fillText(String(row.item.quantity), 800, y + 30)
    ctx.fillText(formatMoney(row.item.price), 640, y + 30)
    const lineDiscount = invoiceLineDiscount(row.item)
    ctx.fillStyle = lineDiscount > 0 ? '#B91C1C' : '#968B7E'
    ctx.direction = 'ltr'
    ctx.fillText(lineDiscount > 0 ? `− ${formatMoney(lineDiscount)}` : '—', 480, y + 30)
    ctx.direction = 'rtl'
    ctx.fillStyle = '#8D6527'
    setImageFont(ctx, 15, 'bold')
    ctx.fillText(formatMoney(invoiceLineTotal(row.item)), 240, y + 30)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#B4A898'
    setImageFont(ctx, 12)
    ctx.textAlign = 'center'
    ctx.fillText(String(index + 1), IMAGE_WIDTH - IMAGE_PADDING - 24, y + 30)
    ctx.textAlign = 'right'
    y += rowHeight
  }

  // ── Notes + totals ──
  y += 34
  const totalsBoxX = IMAGE_PADDING
  const totalsBoxWidth = 480
  roundedRect(ctx, totalsBoxX, y, totalsBoxWidth, totalsHeight, 16)
  ctx.fillStyle = '#FAF7F2'
  ctx.fill()
  ctx.strokeStyle = '#EADBCE'
  roundedRect(ctx, totalsBoxX, y, totalsBoxWidth, totalsHeight, 16)
  ctx.stroke()

  let lineY = y + 32
  const totalsRight = totalsBoxX + totalsBoxWidth - 20
  setImageFont(ctx, 15)
  ctx.fillStyle = '#685D52'
  ctx.fillText('المجموع', totalsRight, lineY)
  ctx.textAlign = 'left'
  ctx.fillText(formatMoney(totals.subtotal), totalsBoxX + 20, lineY)
  ctx.textAlign = 'right'
  lineY += 28
  if (totals.itemsDiscount > 0) {
    ctx.fillStyle = '#B91C1C'
    ctx.fillText('خصم الأصناف', totalsRight, lineY)
    ctx.textAlign = 'left'
    ctx.direction = 'ltr'
    ctx.fillText(`− ${formatMoney(totals.itemsDiscount)}`, totalsBoxX + 20, lineY)
    ctx.direction = 'rtl'
    ctx.textAlign = 'right'
    lineY += 28
  }
  if (totals.extraDiscount > 0) {
    ctx.fillStyle = '#B91C1C'
    ctx.fillText('خصم إضافي', totalsRight, lineY)
    ctx.textAlign = 'left'
    ctx.direction = 'ltr'
    ctx.fillText(`− ${formatMoney(totals.extraDiscount)}`, totalsBoxX + 20, lineY)
    ctx.direction = 'rtl'
    ctx.textAlign = 'right'
    lineY += 28
  }

  ctx.strokeStyle = '#C59B4B'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(totalsBoxX + 20, lineY + 6)
  ctx.lineTo(totalsBoxX + totalsBoxWidth - 20, lineY + 6)
  ctx.stroke()
  lineY += 40
  setImageFont(ctx, 17, 'bold')
  ctx.fillStyle = '#8D6527'
  ctx.fillText('الإجمالي النهائي', totalsRight, lineY)
  setImageFont(ctx, 22, 'bold')
  ctx.textAlign = 'left'
  ctx.fillText(formatMoney(totals.total), totalsBoxX + 20, lineY + 1)
  ctx.textAlign = 'right'

  const notesBoxX = IMAGE_PADDING + 500
  const notesBoxWidth = IMAGE_CONTENT_WIDTH - 500
  roundedRect(ctx, notesBoxX, y, notesBoxWidth, summaryHeight, 16)
  ctx.fillStyle = '#FFFCF8'
  ctx.fill()
  ctx.strokeStyle = '#EADBCE'
  ctx.setLineDash([6, 5])
  roundedRect(ctx, notesBoxX, y, notesBoxWidth, summaryHeight, 16)
  ctx.stroke()
  ctx.setLineDash([])
  const notesRight = notesBoxX + notesBoxWidth - 20
  setImageFont(ctx, 14, 'bold')
  ctx.fillStyle = '#8D6527'
  ctx.fillText('ملاحظات', notesRight, y + 32)
  setImageFont(ctx, 14)
  ctx.fillStyle = '#685D52'
  drawCanvasLines(ctx, notesLines, notesRight, y + 62, 24, 8)
  y += summaryHeight

  // ── Signature ──
  y += 34
  setImageFont(ctx, 14, 'bold')
  ctx.fillStyle = '#8D6527'
  ctx.fillText('التوقيع والاعتماد', IMAGE_WIDTH - IMAGE_PADDING, y + 18)
  y += 34

  if (signatures.length > 0) {
    const gap = 16
    const boxWidthSig = signatures.length === 1 ? 420 : (IMAGE_CONTENT_WIDTH - gap * (signatures.length - 1)) / signatures.length
    signatures.forEach((entry, index) => {
      const x = IMAGE_WIDTH - IMAGE_PADDING - boxWidthSig - index * (boxWidthSig + gap)
      roundedRect(ctx, x, y, boxWidthSig, 132, 14)
      ctx.fillStyle = '#FFFEFA'
      ctx.fill()
      ctx.strokeStyle = '#D9C7B2'
      ctx.setLineDash([6, 5])
      ctx.lineWidth = 1
      roundedRect(ctx, x, y, boxWidthSig, 132, 14)
      ctx.stroke()
      ctx.setLineDash([])
      drawContainedImage(ctx, entry.image, x + 16, y + 10, boxWidthSig - 32, 90)
      setImageFont(ctx, 12)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#968B7E'
      ctx.fillText(entry.label, x + boxWidthSig / 2, y + 120)
      ctx.textAlign = 'right'
    })
  } else {
    roundedRect(ctx, IMAGE_WIDTH - IMAGE_PADDING - 420, y, 420, 132, 14)
    ctx.fillStyle = '#FFFEFA'
    ctx.fill()
    ctx.strokeStyle = '#D9C7B2'
    ctx.setLineDash([6, 5])
    ctx.lineWidth = 1
    roundedRect(ctx, IMAGE_WIDTH - IMAGE_PADDING - 420, y, 420, 132, 14)
    ctx.stroke()
    ctx.setLineDash([])
    setImageFont(ctx, 12)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#B4A898'
    ctx.fillText('التوقيع', IMAGE_WIDTH - IMAGE_PADDING - 210, y + 70)
    ctx.textAlign = 'right'
  }

  // ── Footer ──
  setImageFont(ctx, 13)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#8D6527'
  ctx.fillText(`شكراً لثقتك بمتجر ${settings.storeName}`, IMAGE_WIDTH / 2, height - 46)
  setImageFont(ctx, 12)
  ctx.fillStyle = '#968B7E'
  const contact = [
    settings.phone,
    settings.whatsappNumber ? normalizeWhatsAppNumber(settings.whatsappNumber) : '',
    settings.email,
  ].filter(Boolean).join(' · ')
  ctx.direction = 'ltr'
  ctx.textAlign = 'center'
  ctx.fillText(contact || 'هذه الفاتورة صادرة إلكترونياً من لوحة الهدى.', IMAGE_WIDTH / 2, height - 24)
  ctx.direction = 'rtl'

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر إنشاء صورة الفاتورة.')), 'image/png')
  })
}

/** Download the rendered invoice image with a predictable file name. */
export function downloadManualInvoiceImage(blob: Blob, invoice: Invoice) {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${invoice.invoiceNumber || 'invoice'}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
