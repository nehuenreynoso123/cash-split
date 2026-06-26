interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
}: PaginationProps) {
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="bg-surface-container-low px-6 py-4 flex items-center justify-between border-t border-outline-variant">
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        Mostrando {from}-{to} de {totalItems} resultados
      </span>
      <div className="flex items-center gap-2">
        <button
          className="p-2 border border-outline-variant rounded-lg hover:bg-white transition-colors disabled:opacity-40"
          disabled={currentPage <= 1}
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, idx, arr) => (
            <span key={p} className="contents">
              {idx > 0 && arr[idx - 1] !== p - 1 && (
                <span className="px-1 text-on-surface-variant">...</span>
              )}
              <button
                className={`w-8 h-8 flex items-center justify-center rounded-lg font-data-mono text-sm ${
                  p === currentPage
                    ? 'bg-secondary text-on-secondary'
                    : 'hover:bg-white border border-transparent hover:border-outline-variant'
                }`}
              >
                {p}
              </button>
            </span>
          ))}

        <button
          className="p-2 border border-outline-variant rounded-lg hover:bg-white transition-colors disabled:opacity-40"
          disabled={currentPage >= totalPages}
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
