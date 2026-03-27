import { useMemo } from "react";

export default function AuthPanel({
  session,
  authLoading,
  authSubmitting,
  credentials,
  onCredentialsChange,
  onSignIn,
  onSignUp,
  onResetPassword,
}) {
  const hasEmail = useMemo(
    () => credentials.email.trim().length > 0,
    [credentials.email],
  );

  if (session) return null;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-xl shadow-black/30">
      {/* Top gradient strip */}
      <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

      <div className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
            <svg
              className="h-5 w-5 text-sky-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-100">Iniciar sesión</p>
            <p className="text-xs text-slate-500">
              Necesitás sesión para despachar, ajustar e importar.
            </p>
          </div>
        </div>

        {authLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
            Verificando sesión...
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSignIn();
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) =>
                    onCredentialsChange((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="usuario@ejemplo.com"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) =>
                    onCredentialsChange((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={authSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </button>
              <button
                type="button"
                onClick={onSignUp}
                disabled={authSubmitting}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={onResetPassword}
                disabled={authSubmitting || !hasEmail}
                className="ml-auto text-xs font-medium text-slate-500 transition hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Olvidé mi contraseña
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
