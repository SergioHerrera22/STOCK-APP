import { describe, expect, it } from "vitest";
import { mapSupabaseError } from "./errorMapper";

describe("mapSupabaseError", () => {
  it("traduce credenciales invalidas", () => {
    const message = mapSupabaseError({ message: "Invalid login credentials" });
    expect(message).toBe(
      "Credenciales invalidas. Verifica email y contrasena.",
    );
  });

  it("traduce sesion requerida", () => {
    const message = mapSupabaseError({
      message: "Debes iniciar sesion para despachar pedidos",
    });
    expect(message).toBe("Necesitas iniciar sesion para realizar esta accion.");
  });

  it("usa fallback cuando no hay mensaje", () => {
    const message = mapSupabaseError(null, "Fallback custom");
    expect(message).toBe("Fallback custom");
  });
});
