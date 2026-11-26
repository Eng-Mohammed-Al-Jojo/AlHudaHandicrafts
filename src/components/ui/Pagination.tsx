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

  // Show at most 3 page numbers per window; clicking "..." shifts to the previous/next window
  const windowIndex = Math.floor((safePageValue(currentPage, totalPages) - 1) / 3)
  const windowStart = windowIndex * 3 + 1
  const windowEnd = Math.min(totalPages, windowStart + 2)
  const visiblePages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, i) => windowStart + i
  )

  return (
    <div className={`flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-3 ${className}`} dir="rtl">
      {/* Results info & page size on mobile */}
      <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
        <p className="text-xs text-[#685D52] shrink-0 m-0">
          {totalItems === 0 ? 'لا توجد نتائج' : (
            <>عرض <strong className="text-[#221811]">{startItem}–{endItem}</strong> من <strong className="text-[#221811]">{totalItems}</strong></>
          )}
        </p>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
            className="sm:hidden border border-[#EADBCE] rounded-lg text-xs text-[#221811] bg-white px-2 py-1.5 outline-none focus:border-[#8D6527] cursor-pointer"
          >
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>{s} لكل صفحة</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
        {/* Page size selector (desktop) */}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
            className="hidden sm:block border border-[#EADBCE] rounded-lg text-xs text-[#221811] bg-white px-2 py-1.5 outline-none focus:border-[#8D6527] cursor-pointer"
          >
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>{s} لكل صفحة</option>
            ))}
          </select>
        )}

        {/* Navigation buttons */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1 max-w-full">
            {/* First */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default text-xs shrink-0"
              title="الصفحة الأولى"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
            {/* Prev */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default shrink-0"
              title="السابق"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Previous window button */}
            {windowStart > 1 && (
              <button
                onClick={() => onPageChange(windowStart - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-xs font-bold text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] transition-colors cursor-pointer shrink-0"
                title={`الصفحات ${Math.max(1, windowStart - 3)}–${windowStart - 1}`}
              >
                …
              </button>
            )}

            {/* Visible 3-page window */}
            {visiblePages.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  page === currentPage
                    ? 'bg-[#8D6527] text-white shadow-sm'
                    : 'border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527]'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Next window button */}
            {windowEnd < totalPages && (
              <button
                onClick={() => onPageChange(windowEnd + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-xs font-bold text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] transition-colors cursor-pointer shrink-0"
                title={`الصفحات ${windowEnd + 1}–${Math.min(totalPages, windowEnd + 3)}`}
              >
                …
              </button>
            )}

            {/* Next */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default shrink-0"
              title="التالي"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {/* Last */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#EADBCE] text-[#685D52] hover:border-[#8D6527] hover:text-[#8D6527] disabled:opacity-30 disabled:hover:border-[#EADBCE] disabled:hover:text-[#685D52] transition-colors cursor-pointer disabled:cursor-default shrink-0"
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

function safePageValue(currentPage: number, totalPages: number) {
  return Math.max(1, Math.min(currentPage, Math.max(1, totalPages)))
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
