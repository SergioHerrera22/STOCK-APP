import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PaginationControls from "./PaginationControls";

const ROLES = [
  { value: "sucursal", label: "Sucursal" },
  { value: "deposito", label: "Depósito" },
  { value: "administrador", label: "Administrador" },
];

const SUCURSALES = [
  { value: "sucursal_1", label: "CAPITAL" },
  { value: "sucursal_2", label: "RAWSON" },
  { value: "sucursal_3", label: "FALUCHO" },
];

export default function UsersPermissionsTab({ onSaved }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState({
    email: "",
    rol: "sucursal",
    sucursal_id: "sucursal_1",
  });

  const requiresSucursal = form.rol === "sucursal";

  const loadProfiles = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("perfiles")
      .select("id,email,rol,sucursal_id,creado_at")
      .order("email", { ascending: true });

    setLoading(false);

    if (fetchError) {
      setError(`No se pudieron cargar perfiles: ${fetchError.message}`);
      return;
    }

    setProfiles(data ?? []);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const email = form.email.trim().toLowerCase();
    if (!email) {
      setError("Ingresá un email.");
      return;
    }

    if (requiresSucursal && !form.sucursal_id) {
      setError("Seleccioná una sucursal para el rol sucursal.");
      return;
    }

    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc(
      "admin_set_user_permissions",
      {
        p_email: email,
        p_rol: form.rol,
        p_sucursal_id: requiresSucursal ? form.sucursal_id : null,
      },
    );
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSuccess("Permisos guardados correctamente.");
    onSaved?.();
    await loadProfiles();
  };

  const mappedRows = useMemo(
    () =>
      profiles.map((row) => ({
        ...row,
        rolLabel:
          row.rol === "administrador"
            ? "Administrador"
            : row.rol === "deposito"
              ? "Depósito"
              : "Sucursal",
        sucursalLabel:
          row.sucursal_id === "sucursal_1"
            ? "CAPITAL"
            : row.sucursal_id === "sucursal_2"
              ? "RAWSON"
              : row.sucursal_id === "sucursal_3"
                ? "FALUCHO"
                : "-",
      })),
    [profiles],
  );

  useEffect(() => {
    setPage(1);
  }, [profiles.length]);

  const totalPages = Math.max(1, Math.ceil(mappedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = mappedRows.slice(startIndex, endIndex);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-slate-100">Usuarios y permisos</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Solo administrador puede asignar permisos por usuario.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 p-5 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email del usuario
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="usuario@robles.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-sky-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rol
            </label>
            <select
              value={form.rol}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, rol: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
            >
              {ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sucursal
            </label>
            <select
              value={form.sucursal_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sucursal_id: e.target.value }))
              }
              disabled={!requiresSucursal}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500 disabled:opacity-40"
            >
              {SUCURSALES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Guardar permisos"}
            </button>
            {success && <p className="text-sm text-emerald-400">{success}</p>}
            {error && <p className="text-sm text-rose-400">{error}</p>}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-800 px-5 py-3">
          <p className="text-sm font-semibold text-slate-200">
            Perfiles actuales
          </p>
        </div>

        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-500">
            Cargando perfiles...
          </div>
        ) : mappedRows.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">
            <p>No hay perfiles cargados.</p>
            <p className="mt-1 text-xs text-slate-600">
              Primero creá usuarios en Supabase Auth y luego asignales permisos
              desde este formulario.
            </p>
          </div>
        ) : (
          <>
            {/* Vista móvil: tarjetas */}
            <div className="space-y-3 p-4 md:hidden">
              {paginatedRows.map((row) => (
                <article
                  key={`${row.id}-mobile`}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {row.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                      {row.rolLabel}
                    </span>
                    {row.sucursal_id && (
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-300">
                        {row.sucursalLabel}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        email: row.email,
                        rol: row.rol,
                        sucursal_id: row.sucursal_id ?? "sucursal_1",
                      })
                    }
                    className="mt-3 w-full rounded-lg border border-slate-700 py-2 text-xs font-medium text-slate-300 transition hover:border-sky-600 hover:text-sky-300"
                  >
                    Editar permisos
                  </button>
                </article>
              ))}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Sucursal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-200">{row.email}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.rolLabel}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.sucursalLabel}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              email: row.email,
                              rol: row.rol,
                              sucursal_id: row.sucursal_id ?? "sucursal_1",
                            })
                          }
                          className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-sky-600 hover:text-sky-300"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <PaginationControls
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          label={`Mostrando ${mappedRows.length === 0 ? 0 : startIndex + 1}-${Math.min(endIndex, mappedRows.length)} de ${mappedRows.length} usuarios`}
        />
      </div>
    </div>
  );
}
