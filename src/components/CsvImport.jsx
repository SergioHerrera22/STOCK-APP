import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabaseClient";

const REQUIRED_HEADERS = ["nombre", "marca", "categoria", "tamaño"];

const COLUMN_GUIDE = [
  { col: "nombre", desc: "Nombre del producto", req: true },
  { col: "marca", desc: "Marca", req: true },
  { col: "categoria", desc: "Categoría", req: true },
  { col: "tamaño", desc: "Tamaño / presentación", req: true },
  { col: "codigo_barras", desc: "Código de barras", req: false },
];

const PREVIEW_COLS = [
  "nombre",
  "marca",
  "categoria",
  "tamaño",
  "codigo_barras",
];
const PREVIEW_LABELS = {
  nombre: "Nombre",
  marca: "Marca",
  categoria: "Categoría",
  tamaño: "Tamaño",
  codigo_barras: "Cód. de barras",
};

export default function CsvImport({ onImported }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null); // { rows, totalRows }

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setPreview(null);
    setProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const missing = REQUIRED_HEADERS.filter(
          (header) => !meta.fields?.includes(header),
        );
        if (missing.length) {
          setResult({
            type: "error",
            message: `Faltan columnas: ${missing.join(", ")}`,
          });
          return;
        }
        setPreview({ rows: data, totalRows: data.length });
      },
      error: (error) => {
        setResult({ type: "error", message: error.message });
      },
    });
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setFileName("");
    setResult(null);
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    const data = preview.rows;
    setPreview(null);
    setLoading(true);

    let imported = 0;
    const errors = [];
    const total = data.length;

    for (const [index, row] of data.entries()) {
      setProgress(Math.round(((index + 1) / total) * 100));
      try {
        const productPayload = {
          nombre: row.nombre?.trim(),
          marca: row.marca?.trim(),
          categoria: row.categoria?.trim(),
          tamaño: row.tamaño?.trim(),
          codigo_barras: row.codigo_barras?.trim() || null,
        };

        if (!productPayload.nombre) {
          errors.push(`Fila ${index + 2}: nombre vacío`);
          continue;
        }

        const { data: producto, error: productError } = await supabase
          .from("productos")
          .insert(productPayload)
          .select("id")
          .single();

        if (productError) throw productError;

        imported += 1;
      } catch (error) {
        errors.push(`Fila ${index + 2}: ${error.message}`);
      }
    }

    setLoading(false);
    setProgress(100);
    setResult({
      type: errors.length ? "warning" : "success",
      message: `Importados: ${imported} de ${total}. Errores: ${errors.length}`,
      details: errors.slice(0, 8),
    });

    if (imported > 0 && onImported) onImported();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="font-semibold text-slate-100">
          Importación masiva de productos
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Cargá un CSV para insertar productos y su stock inicial en todas las
          ubicaciones.
        </p>
      </div>

      {/* ── Preview step ── */}
      {preview ? (
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">
              Vista previa —{" "}
              <span className="text-sky-400">{preview.totalRows}</span> filas
              detectadas
            </p>
            <p className="text-xs text-slate-500">
              Mostrando las primeras {Math.min(10, preview.totalRows)}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60">
                  {PREVIEW_COLS.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-500"
                    >
                      {PREVIEW_LABELS[col]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {preview.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    {PREVIEW_COLS.map((col) => (
                      <td
                        key={col}
                        className="max-w-[140px] truncate whitespace-nowrap px-3 py-1.5 text-slate-300"
                      >
                        {row[col] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.totalRows > 10 && (
            <p className="text-xs text-slate-500">
              ... y {preview.totalRows - 10} filas más
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirmImport}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Confirmar importación ({preview.totalRows} productos)
            </button>
            <button
              onClick={handleCancelPreview}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 p-5 md:grid-cols-2">
          {/* Left: upload */}
          <div className="space-y-4">
            <label
              htmlFor="csv-input"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 px-6 py-10 text-center transition hover:border-sky-600 hover:bg-sky-950/20"
            >
              <span className="text-3xl">&#x1F4C4;</span>
              <div>
                <p className="text-sm font-medium text-slate-300">
                  {fileName ? fileName : "Hacer clic para seleccionar archivo"}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Solo archivos .csv
                </p>
              </div>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="sr-only"
              />
            </label>

            {/* Progress bar */}
            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Importando...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  result.type === "error"
                    ? "border-rose-700/40 bg-rose-950/30 text-rose-300"
                    : result.type === "warning"
                      ? "border-amber-700/40 bg-amber-950/30 text-amber-300"
                      : "border-emerald-700/40 bg-emerald-950/30 text-emerald-300"
                }`}
              >
                <p className="font-semibold">{result.message}</p>
                {result.details?.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs opacity-80">
                    {result.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right: column guide */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Columnas requeridas del CSV
            </p>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">
                      Columna
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">
                      Descripción
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">
                      Req.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMN_GUIDE.map((item) => (
                    <tr
                      key={item.col}
                      className="border-b border-slate-800/40 last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-sky-400">
                        {item.col}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{item.desc}</td>
                      <td className="px-3 py-2">
                        {item.req ? (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400">
                            Sí
                          </span>
                        ) : (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-500">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
