import { requireUser } from "@/server/auth/guards";
import { getUserById } from "@/server/auth/service";
import { getDb } from "@/server/db/client";
import { toErrorResponse, unauthorized } from "@/server/lib/errors";
import { jsonSuccess } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireUser();
    // Se relee de la BD para reflejar nombre, correo o rol actualizados.
    const user = getUserById(getDb(), actor.id);
    if (!user) throw unauthorized("Tu cuenta ya no existe. Inicia sesión nuevamente.");
    return jsonSuccess(user);
  } catch (error) {
    return toErrorResponse(error);
  }
}
