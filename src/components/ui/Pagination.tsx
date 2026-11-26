import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}: Props) {
  if (totalPages <= 1 && totalItems <= pageSizeOptions[0]) return null

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Build visible page numbers with ellipsis
  function getPages(): (number | 'ellipsis')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | 'ellipsis')[] = [1]
    if (currentPage > 3) pages.push('ellipsis')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`} dir="rtl">
      {/* Results info */}
      <p className="text-xs text-[#685D52] shrink-0">
        {totalItems === 0 ? 'لا توجد نتائج' : (
          <>عرض <strong className="text-[#221811]">{startItem}–{endItem}</strong> من <strong className="text-[#221811]">{totalItems}</strong></>
        )}
      </p>

      <div className="flex items-center gap-2">
        {/* Page size selector */}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
            className="border border-[#EADBCE] rounded-lg text-xs text-[#221811] bg-white px-2 py-1.5 outline-none focus:border-[#8D6527] cursor-pointer"
          >
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>{s} لكل صفحة</option>
            ))}
          </select>
        )}

        {/* Navigation buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* First */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default text-xs"
              title="الصفحة الأولى"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
            {/* Prev */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default"
              title="السابق"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Page numbers */}
            {getPages().map((page, idx) =>
              page === 'ellipsis' ? (
                <span key={`e${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-[#968B7E]">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                    page === currentPage
                      ? 'bg-[#8D6527] text-white shadow-sm'
                      : 'border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527]'
                  }`}
                >
                  {page}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default"
              title="التالي"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {/* Last */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default"
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Hook: paginate a sorted/filtered array */
export function usePagination<T>(items: T[], pageSize: number, currentPage: number) {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)
  return { pageItems, totalItems, totalPages, safePage }
}
