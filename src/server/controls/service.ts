import "server-only";

import type { ControlRow } from "@/server/db/types";
import { conflict, forbidden, notFound } from "@/server/lib/errors";
import type { ServiceContext } from "@/server/lib/context";
import { toControlDTO } from "@/server/lib/serializers";
import type { ControlDTO, Theme } from "@/shared/types";
import type { ControlCreateInput, ControlUpdateInput } from "./schemas";

function soloAdmin(ctx: ServiceContext): void {
  if (ctx.actor.role !== "admin") {
    throw forbidden("Esta acción requiere el rol de administrador");
  }
}

export function listControls(
  ctx: ServiceContext,
  filtros: { active?: "0" | "1"; theme?: Theme } = {},
): ControlDTO[] {
  const condiciones: string[] = [];
  const parametros: Array<string | number> = [];

  if (filtros.active) {
    condiciones.push("active = ?");
    parametros.push(Number(filtros.active));
  }
  if (filtros.theme) {
    condiciones.push("theme = ?");
    parametros.push(filtros.theme);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  const filas = ctx.db
    .prepare(`SELECT * FROM controls ${where} ORDER BY id`)
    .all(...parametros) as ControlRow[];
  return filas.map(toControlDTO);
}

export function createControl(ctx: ServiceContext, input: ControlCreateInput): ControlDTO {
  soloAdmin(ctx);
  const duplicado = ctx.db.prepare("SELECT 1 FROM controls WHERE code = ?").get(input.code);
  if (duplicado) throw conflict("Ya existe un control con ese código.");

  const resultado = ctx.db
    .prepare(
      `INSERT INTO controls (code, name, description, criterion, source, theme, active)
       VALUES (@code, @name, @description, @criterion, @source, @theme, @active)`,
    )
    .run({ ...input, active: input.active ? 1 : 0 });

  const fila = ctx.db.prepare("SELECT * FROM controls WHERE id = ?").get(resultado.lastInsertRowid) as
    | ControlRow
    | undefined;
  if (!fila) throw notFound("Control no encontrado");
  return toControlDTO(fila);
}

/** Actualiza sólo el catálogo: las evaluaciones ya existentes no se alteran. */
export function updateControl(ctx: ServiceContext, id: number, input: ControlUpdateInput): ControlDTO {
  soloAdmin(ctx);
  const fila = ctx.db.prepare("SELECT * FROM controls WHERE id = ?").get(id) as ControlRow | undefined;
  if (!fila) throw notFound("Control no encontrado");

  const duplicado = ctx.db.prepare("SELECT id FROM controls WHERE code = ?").get(input.code) as
    | { id: number }
    | undefined;
  if (duplicado && duplicado.id !== id) throw conflict("Ya existe un control con ese código.");

  ctx.db
    .prepare(
      `UPDATE controls
          SET code = @code, name = @name, description = @description, criterion = @criterion,
              source = @source, theme = @theme, active = @active
        WHERE id = @id`,
    )
    .run({ ...input, active: input.active ? 1 : 0, id });

  const actualizado = ctx.db.prepare("SELECT * FROM controls WHERE id = ?").get(id) as ControlRow;
  return toControlDTO(actualizado);
}
