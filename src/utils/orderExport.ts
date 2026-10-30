import type { Order } from '../types'

function exportDate(date: string) {
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString('ar-EG')
}

/** Creates a real .xlsx file from the currently filtered order list. */
export async function exportOrdersToExcel(orders: Order[]) {
  // Prepare data rows first
  const rows = orders.map((order, index) => ({
    '#': index + 1,
    'رقم الطلب': order.id,
    'تاريخ الطلب': exportDate(order.createdAt),
    'العميلة': order.customer,
    'رقم الهاتف': order.phone ?? '',
    'البريد الإلكتروني': order.email ?? '—',
    'المحافظة': order.governorate ?? '—',
    'المدينة': order.city ?? '—',
    'العنوان': order.address ?? '—',
    'الحالة': order.status,
    'المنتجات': order.items.map(item => `${item.productName} × ${item.quantity ?? 1}`).join('، '),
    'عملة العرض': order.displayCurrency ?? '—',
    'سعر الصرف (ILS لكل وحدة)': order.displayRate ?? '—',
    'قيمة العرض': order.displayTotal ?? '—',
    'حالة الشحن': order.shippingStatus === 'free' ? 'مجاني' : order.shippingStatus === 'standard' ? 'عادي' : '—',
    'عدد القطع': order.itemsCount,
    'الإجمالي (شيكل)': order.total,
    'ملاحظات': order.notes ?? ''
  }))

  // Load ExcelJS dynamically to keep it out of the initial bundle
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('الطلبات')

  // Define column widths (approximate Arabic text widths)
  const widths = [6, 24, 22, 20, 18, 24, 18, 18, 36, 16, 44, 14, 24, 16, 16, 12, 18, 52]
  sheet.columns = Object.keys(rows[0]).map((key, idx) => ({ header: key, key, width: widths[idx] || 15 }))

  // Add data rows
  sheet.addRows(rows)

  // Right‑to‑left view for Arabic layout
  sheet.views = [{ rightToLeft: true }]

  // Write the file
  await workbook.xlsx.writeFile(`طلبات-متجر-الهدى-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
