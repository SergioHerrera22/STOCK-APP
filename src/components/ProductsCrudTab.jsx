import { useEffect, useMemo, useState } from "react";

const EMPTY_FORM = {
  nombre: "",
  marca: "",
  categoria: "",
  tamaño: "",
  codigo_barras: "",
};

function ProductForm({ title, form, setForm, onSubmit, submitLabel, loading }) {
  const canSubmit =
    form.nombre.trim() &&
    form.marca.trim() &&
    form.categoria.trim() &&
    form.tamaño.trim();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-400">Nombre *</span>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, nombre: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-500"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-400">Marca *</span>
          <input
            type="text"
            value={form.marca}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, marca: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-500"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-400">Categoría *</span>
          <input
            type="text"
            value={form.categoria}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, categoria: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-500"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-400">Tamaño *</span>
          <input
            type="text"
            value={form.tamaño}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tamaño: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-500"
          />
        </label>
        <label className="space-y-1.5 text-sm md:col-span-2">
          <span className="text-slate-400">Código de barras (opcional)</span>
          <input
            type="text"
            value={form.codigo_barras}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, codigo_barras: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-500"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {submitLabel}
      </button>
    </div>
  );
}

export default function ProductsCrudTab({
  products = [],
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
  isUpdating,
  isDeleting,
  deletingId,
  updatingId,
}) {
  const [search, setSearch] = useState("");
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!editId) return;
    const current = products.find((p) => p.id === editId);
    if (!current) {
      setEditId(null);
      setEditForm(EMPTY_FORM);
    }
  }, [products, editId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      [p.nombre, p.marca, p.categoria, p.tamaño, p.codigo_barras]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [products, search]);

  const startEdit = (product) => {
    setEditId(product.id);
    setEditForm({
      nombre: product.nombre ?? "",
      marca: product.marca ?? "",
      categoria: product.categoria ?? "",
      tamaño: product.tamaño ?? "",
      codigo_barras: product.codigo_barras ?? "",
    });
  };

  const handleCreate = () => {
    onCreate({
      nombre: createForm.nombre.trim(),
      marca: createForm.marca.trim(),
      categoria: createForm.categoria.trim(),
      tamaño: createForm.tamaño.trim(),
      codigo_barras: createForm.codigo_barras.trim() || null,
    });
    setCreateForm(EMPTY_FORM);
  };

  const handleUpdate = () => {
    if (!editId) return;
    onUpdate({
      id: editId,
      nombre: editForm.nombre.trim(),
      marca: editForm.marca.trim(),
      categoria: editForm.categoria.trim(),
      tamaño: editForm.tamaño.trim(),
      codigo_barras: editForm.codigo_barras.trim() || null,
    });
  };

  return (
    <div className="space-y-5">
      <ProductForm
        title="Nuevo producto"
        form={createForm}
        setForm={setCreateForm}
        onSubmit={handleCreate}
        submitLabel="Agregar producto"
        loading={isCreating}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-100">
                Gestión de productos
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {filtered.length} de {products.length} producto
                {products.length !== 1 ? "s" : ""}
              </p>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, marca, categoría, tamaño o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition md:max-w-md focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Marca
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tamaño
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Cargando productos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No hay productos para mostrar.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const rowLoading =
                    (isUpdating && updatingId === p.id) ||
                    (isDeleting && deletingId === p.id);
                  const isEditing = editId === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-800/40 ${idx % 2 ? "bg-slate-950/20" : ""}`}
                    >
                      <td className="px-4 py-3 text-slate-400">
                        {p.codigo_barras || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-100">{p.nombre}</td>
                      <td className="px-4 py-3 text-slate-300">{p.marca}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {p.categoria}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.tamaño}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            disabled={rowLoading}
                            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-sky-500 hover:text-sky-300 disabled:opacity-60"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(p)}
                            disabled={rowLoading}
                            className="rounded-lg border border-rose-700/60 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-600/10 disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>

                      {isEditing && <td className="hidden" />}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editId && (
        <ProductForm
          title={`Editando producto #${editId}`}
          form={editForm}
          setForm={setEditForm}
          onSubmit={handleUpdate}
          submitLabel="Guardar cambios"
          loading={isUpdating && updatingId === editId}
        />
      )}

      {editId && (
        <button
          type="button"
          onClick={() => {
            setEditId(null);
            setEditForm(EMPTY_FORM);
          }}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          Cancelar edición
        </button>
      )}
    </div>
  );
}
