import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabaseClient";

const REQUIRED_HEADERS = ["nombre", "marca", "categoria", "tamaño"];

const HEADER_ALIASES = {
  nombre: ["nombre", "nombre del producto", "descripcion", "descripcion"],
  marca: ["marca"],
  categoria: ["categoria", "categoria", "rubro", "linea"],
  tamaño: ["tamano", "tamano", "presentacion", "presentacion", "tam"],
  codigo_barras: ["codigo_barras", "codigo de barras", "codigo", "cod"],
};

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

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function mapKnownHeaders(row) {
  const mapped = {};

  for (const [rawKey, rawValue] of Object.entries(row ?? {})) {
    const key = normalizeText(rawKey);
    const value = String(rawValue ?? "").trim();

    for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
      if (!aliases.includes(key)) continue;
      if (!mapped[canonical]) mapped[canonical] = value;
      break;
    }
  }

  return mapped;
}

function inferCategoria(nombre) {
  const text = normalizeText(nombre).toUpperCase();
  if (text.includes("BARNIZ")) return "Barniz";
  if (text.includes("LATEX") || text.includes("LÁTEX")) return "Látex";
  if (text.includes("CONVERTIDOR")) return "Convertidor";
  if (text.includes("PRIMER")) return "Primer";
  if (text.includes("FONDO")) return "Fondo";
  if (text.includes("ESMALTE") || text.includes("E/S")) return "Esmalte";
  if (text.includes("MEM LIQUIDA") || text.includes("IMPERME")) {
    return "Impermeabilizante";
  }
  return "General";
}

function inferMarca(nombre) {
  const clean = String(nombre ?? "").trim();
  if (!clean) return "Sin marca";
  return clean.split(/\s+/)[0];
}

function inferTamaño(descripcion) {
  const source = String(descripcion ?? "");
  const regex =
    /(\d+\/\d+\s*L|\d+[.,]?\d*\s*(?:L|ML))(?:\s*\+\s*(\d+\/\d+\s*L|\d+[.,]?\d*\s*(?:L|ML)))?/gi;

  let match;
  let last = null;
  while ((match = regex.exec(source)) !== null) {
    last = match[0];
  }

  return last ? last.replace(/\s+/g, "") : "";
}

function normalizeDescription(desc) {
  return String(desc ?? "")
    .replace(/\.{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStructuredReportRows(rows2d) {
  let headerRow = -1;
  let codigoCol = -1;
  let descripcionCol = -1;

  for (let i = 0; i < rows2d.length; i += 1) {
    const row = rows2d[i] ?? [];
    for (let col = 0; col < row.length; col += 1) {
      const cell = normalizeText(row[col]);
      if (cell === "codigo") codigoCol = col;
      if (cell === "descripcion") descripcionCol = col;
    }
    if (codigoCol >= 0 && descripcionCol >= 0) {
      headerRow = i;
      break;
    }
  }

  if (headerRow < 0 || codigoCol < 0 || descripcionCol < 0) return [];

  const readNeighborCell = (row, col) => {
    const center = String(row[col] ?? "").trim();
    if (center) return center;

    const left = String(row[col - 1] ?? "").trim();
    if (left) return left;

    return String(row[col + 1] ?? "").trim();
  };

  const parsed = [];
  for (let i = headerRow + 1; i < rows2d.length; i += 1) {
    const row = rows2d[i] ?? [];
    const codigo = readNeighborCell(row, codigoCol);
    const descripcionRaw = readNeighborCell(row, descripcionCol);
    if (!codigo || !descripcionRaw) continue;

    const nombre = normalizeDescription(descripcionRaw);
    parsed.push({
      nombre,
      marca: inferMarca(nombre),
      categoria: inferCategoria(nombre),
      tamaño: inferTamaño(nombre) || "Sin tamaño",
      codigo_barras: codigo,
    });
  }

  return parsed;
}

async function parseInputFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          const mapped = (data ?? [])
            .map((row) => mapKnownHeaders(row))
            .filter((row) => Object.keys(row).length > 0);
          resolve(mapped);
        },
        error: reject,
      });
    });
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    const mappedJson = jsonRows
      .map((row) => mapKnownHeaders(row))
      .filter((row) => Object.keys(row).length > 0);

    if (mappedJson.length > 0) return mappedJson;

    const rows2d = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: "",
    });
    return parseStructuredReportRows(rows2d);
  }

  throw new Error("Formato no soportado. Usá .csv, .xlsx o .xls");
}

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

    parseInputFile(file)
      .then((rows) => {
        const cleanedRows = rows.filter((row) =>
          Object.values(row).some((v) => String(v ?? "").trim().length > 0),
        );

        if (!cleanedRows.length) {
          setResult({
            type: "error",
            message:
              "No se detectaron filas importables. Revisá el formato del archivo.",
          });
          return;
        }

        const missing = REQUIRED_HEADERS.filter(
          (header) =>
            !cleanedRows.some((row) => String(row[header] ?? "").trim()),
        );

        if (missing.length) {
          setResult({
            type: "error",
            message: `No se pudieron obtener estas columnas requeridas: ${missing.join(
              ", ",
            )}`,
          });
          return;
        }

        setPreview({ rows: cleanedRows, totalRows: cleanedRows.length });
      })
      .catch((error) => {
        setResult({
          type: "error",
          message: error?.message || "No se pudo leer el archivo.",
        });
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
          marca: row.marca?.trim() || inferMarca(row.nombre),
          categoria: row.categoria?.trim() || inferCategoria(row.nombre),
          tamaño: row.tamaño?.trim() || inferTamaño(row.nombre) || "Sin tamaño",
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
          Cargá un archivo CSV o Excel para insertar productos en lote.
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
                  Archivos .csv, .xlsx o .xls
                </p>
              </div>
              <input
                id="csv-input"
                type="file"
                accept=".csv,.xlsx,.xls"
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
              Columnas requeridas del archivo
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
