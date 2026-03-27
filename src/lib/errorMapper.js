export function mapSupabaseError(
  error,
  fallback = "Ocurrio un error inesperado.",
) {
  const message = String(error?.message || "").toLowerCase();

  if (!message) return fallback;

  if (message.includes("invalid login credentials")) {
    return "Credenciales invalidas. Verifica email y contrasena.";
  }

  if (message.includes("email not confirmed")) {
    return "Tu email no esta confirmado. Revisa tu correo.";
  }

  if (message.includes("already registered")) {
    return "Ese email ya esta registrado.";
  }

  if (message.includes("debes iniciar sesion")) {
    return "Necesitas iniciar sesion para realizar esta accion.";
  }

  if (message.includes("sin stock en deposito central")) {
    return "No hay stock disponible en deposito central.";
  }

  if (message.includes("transferencia no encontrada")) {
    return "El pedido ya no esta disponible o fue procesado.";
  }

  return error?.message || fallback;
}
