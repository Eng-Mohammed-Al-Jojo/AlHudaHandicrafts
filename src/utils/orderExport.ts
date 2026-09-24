import type { Order } from '../types'

function exportDate(date: string) {
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString('ar-EG')
}

/** Creates a real .xlsx file from the currently filtered order list. */
export async function exportOrdersToExcel(orders: Order[]) {
  // Keep the spreadsheet engine out of the storefront's initial bundle.
  const XLSX = await import('xlsx')
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
    'ملاحظات': order.notes ?? '',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 36 }, { wch: 16 }, { wch: 44 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 52 }]
  sheet['!views'] = [{ rightToLeft: true }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'الطلبات')
  XLSX.writeFile(workbook, `طلبات-متجر-الهدى-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
