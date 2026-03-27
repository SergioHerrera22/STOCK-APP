const MOTION_TEMPLATES = [
  { label: "Rotura de envase", value: "Rotura de envase" },
  { label: "Vencimiento", value: "Vencimiento del producto" },
  { label: "Donación", value: "Donacion a terceros" },
  {
    label: "Ajuste de inventario",
    value: "Ajuste de inventario por diferencia",
  },
  { label: "Prueba de calidad", value: "Prueba de calidad del producto" },
  { label: "Devolución", value: "Devolucion de cliente" },
  { label: "Regalo/Promoción", value: "Regalo o promocion" },
];

export default function AdjustmentTemplates({ onSelectTemplate }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Motivos frecuentes
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {MOTION_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.value}
            onClick={() => onSelectTemplate(tmpl.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:border-sky-500 hover:bg-slate-800 hover:text-slate-100"
          >
            {tmpl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
