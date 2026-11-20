/** Gráficas del panel. Componente cliente: recharts no se renderiza en servidor. */

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { statusLabel } from "@/lib/ui";
import type { ControlStatus, DashboardDTO, Severity } from "@/shared/types";

const COLOR_ESTADO: Record<ControlStatus, string> = {
  implementado: "#059669",
  parcialmente_implementado: "#d97706",
  no_implementado: "#dc2626",
  no_aplicable: "#6b7280",
  pendiente: "#cbd5e1",
};

const COLOR_SEVERIDAD: Record<Severity, string> = {
  baja: "#059669",
  media: "#d97706",
  alta: "#ea580c",
  critica: "#dc2626",
};

const EJES = { stroke: "#94a3b8", fontSize: 11 };

function etiquetaCorta(texto: string): string {
  return texto.length > 14 ? `${texto.slice(0, 13)}…` : texto;
}

export function DashboardCharts({ datos }: { datos: DashboardDTO }) {
  const estados = datos.distribucionEstadosControl.map((item) => ({
    nombre: statusLabel(item.status),
    total: item.total,
    color: COLOR_ESTADO[item.status],
  }));
  const severidades = datos.hallazgosPorSeveridad.map((item) => ({
    nombre: statusLabel(item.severity),
    total: item.total,
    color: COLOR_SEVERIDAD[item.severity],
  }));
  const cumplimiento = datos.cumplimientoPorAuditoria.map((item) => ({
    nombre: etiquetaCorta(item.organization),
    cumplimiento: item.cumplimiento,
    organizacion: item.organization,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="min-w-0 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">Distribución de estados de control</h2>
        <div className="mt-3 h-64 w-full min-w-0">
          {estados.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estados}
                  dataKey="total"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius="78%"
                  isAnimationActive={false}
                >
                  {estados.map((item) => (
                    <Cell key={item.nombre} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              No hay controles evaluados todavía.
            </p>
          )}
        </div>
      </Card>

      <Card className="min-w-0 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">Hallazgos por severidad</h2>
        <div className="mt-3 h-64 w-full min-w-0">
          {severidades.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severidades} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nombre" tick={EJES} interval={0} />
                <YAxis allowDecimals={false} tick={EJES} />
                <Tooltip />
                <Bar dataKey="total" name="Hallazgos" isAnimationActive={false}>
                  {severidades.map((item) => (
                    <Cell key={item.nombre} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              No hay hallazgos registrados.
            </p>
          )}
        </div>
      </Card>

      <Card className="min-w-0 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">Cumplimiento por auditoría</h2>
        <div className="mt-3 h-64 w-full min-w-0">
          {cumplimiento.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cumplimiento} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nombre" tick={EJES} interval={0} />
                <YAxis domain={[0, 100]} tick={EJES} />
                <Tooltip />
                <Bar
                  dataKey="cumplimiento"
                  name="Cumplimiento (%)"
                  fill="#0f766e"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              No hay auditorías con resultados.
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Las auditorías sin resultado (N/A) no dibujan barra. El nombre se acorta en el eje.
        </p>
      </Card>
    </div>
  );
}

export default DashboardCharts;
