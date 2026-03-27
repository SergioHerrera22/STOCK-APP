export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  label,
}) {
  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <p className="text-xs text-slate-500">{label}</p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(currentPage - 1)}
          disabled={!canPrev}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500"
            >
              1
            </button>
            {start > 2 && (
              <span className="px-1 text-xs text-slate-500">...</span>
            )}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`rounded-md border px-2 py-1 text-xs transition ${
              page === currentPage
                ? "border-orange-400 bg-orange-500/15 text-orange-300"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span className="px-1 text-xs text-slate-500">...</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => canNext && onPageChange(currentPage + 1)}
          disabled={!canNext}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
