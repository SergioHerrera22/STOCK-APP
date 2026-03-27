import { useMemo } from "react";

const LOCATIONS = [
  { key: "sucursal_1", label: "CAPITAL" },
  { key: "sucursal_2", label: "RAWSON" },
  { key: "sucursal_3", label: "FALUCHO" },
  { key: "deposito_central", label: "Depósito" },
];

export default function StockAlertBanner({ stock = [], threshold = 10 }) {
  const criticalProducts = useMemo(() => {
    return (stock ?? []).filter((row) =>
      LOCATIONS.some((loc) => (row[loc.key] ?? 0) <= threshold),
    );
  }, [stock, threshold]);

  if (!criticalProducts.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-rose-500/40 bg-rose-500/10">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚠️</span>
          <p className="font-semibold text-rose-300">
            {criticalProducts.length} producto
            {criticalProducts.length !== 1 ? "s" : ""} con stock bajo
          </p>
        </div>
        <div className="space-y-1 text-xs text-rose-200">
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
      </div>
    </div>
  );
}
