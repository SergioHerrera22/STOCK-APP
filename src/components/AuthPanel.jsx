import { useMemo } from "react";

export default function AuthPanel({
  session,
  authLoading,
  authSubmitting,
  credentials,
  onCredentialsChange,
  onSignIn,
  onSignUp,
  onSignOut,
}) {
  const userEmail = useMemo(() => session?.user?.email ?? "", [session]);

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      <div className="border-b border-slate-800 px-5 py-3">
        <h2 className="font-semibold text-slate-100">Acceso</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          El despacho y la importación de stock requieren sesión iniciada.
        </p>
      </div>

      <div className="p-4">
        {authLoading ? (
          <p className="text-sm text-slate-400">Verificando sesión...</p>
        ) : session ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-300">
              Sesión activa como{" "}
              <span className="font-semibold">{userEmail}</span>
            </p>
            <button
              type="button"
              onClick={onSignOut}
              disabled={authSubmitting}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authSubmitting ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSignIn();
            }}
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"
          >
            <input
              type="email"
              value={credentials.email}
              onChange={(event) =>
                onCredentialsChange((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              placeholder="Email"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-600 focus:outline-none"
              required
            />
            <input
              type="password"
              value={credentials.password}
              onChange={(event) =>
                onCredentialsChange((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              placeholder="Contraseña"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-600 focus:outline-none"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={authSubmitting}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
            <button
              type="button"
              onClick={onSignUp}
              disabled={authSubmitting}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Crear cuenta
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
