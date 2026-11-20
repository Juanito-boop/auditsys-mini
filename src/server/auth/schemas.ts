import { z } from "zod";

/** Contrato del formulario de login; módulo puro, reutilizable en el cliente. */
export const loginSchema = z.object({
  email: z
    .email({ message: "Introduce un correo electrónico válido." })
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria.")
    .max(200, "La contraseña no puede superar los 200 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginInputRaw = z.input<typeof loginSchema>;
