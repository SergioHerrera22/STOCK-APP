import { useMemo, useState } from "react";

const LS_KEY = "robles.alert.threshold";
const DEFAULT_THRESHOLD = 10;

const LOCATIONS = [
  { key: "sucursal_1", label: "CAPITAL" },
  { key: "sucursal_2", label: "RAWSON" },
  { key: "sucursal_3", label: "FALUCHO" },
  { key: "deposito_central", label: "Depósito" },
];

function readThreshold() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v !== null) {
      const n = parseInt(v, 10);
      if (!isNaN(n) && n >= 0) return n;
    }
  } catch {}
  return DEFAULT_THRESHOLD;
}

export default function StockAlertBanner({ stock = [] }) {
  const [threshold, setThresholdState] = useState(readThreshold);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(threshold));

  const criticalProducts = useMemo(() => {
    return (stock ?? []).filter((row) =>
      LOCATIONS.some((loc) => (row[loc.key] ?? 0) <= threshold),
    );
  }, [stock, threshold]);

  const applyDraft = () => {
    const n = parseInt(draft, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_THRESHOLD : n;
    setThresholdState(val);
    localStorage.setItem(LS_KEY, String(val));
    setDraft(String(val));
    setEditing(false);
  };

  if (!criticalProducts.length && !editing) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-rose-500/40 bg-rose-500/10">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <p className="font-semibold text-rose-300">
              {criticalProducts.length} producto
              {criticalProducts.length !== 1 ? "s" : ""} con stock ≤ {threshold}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraft(String(threshold));
              setEditing((v) => !v);
            }}
            title="Configurar umbral de alerta"
            className="shrink-0 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] font-medium text-rose-300 transition hover:bg-rose-500/20"
          >
            {editing ? "Cancelar" : "⚙ Umbral"}
          </button>
        </div>

        {editing && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-rose-200">
              Alertar cuando stock ≤
            </label>
            <input
              type="number"
              min="0"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyDraft()}
              className="w-20 rounded-lg border border-rose-500/40 bg-rose-950/40 px-2 py-1 text-sm text-rose-100 outline-none focus:border-rose-400"
              autoFocus
            />
            <button
              type="button"
              onClick={applyDraft}
              className="rounded-lg bg-rose-600/80 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              Guardar
            </button>
          </div>
        )}

        {criticalProducts.length > 0 && (
          <div className="mt-2 space-y-1 text-xs text-rose-200">
            {criticalProducts.slice(0, 5).map((p) => (
              <p key={p.id}>
                • {p.nombre} —{" "}
                {LOCATIONS.map((loc) => {
                  const qty = p[loc.key] ?? 0;
                  if (qty <= threshold) return `${loc.label}: ${qty}`;
                  return null;
                })
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            ))}
            {criticalProducts.length > 5 && (
              <p className="pt-1 font-semibold">
                +{criticalProducts.length - 5} más...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
