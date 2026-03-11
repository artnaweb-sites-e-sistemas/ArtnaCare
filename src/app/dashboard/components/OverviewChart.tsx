"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type LogEntry = {
  status: string;
  checkedAt?: { seconds?: number };
};

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function OverviewChart() {
  const [data, setData] = useState<{ date: string; saudáveis: number; avisos: number; críticos: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cron/monitoring")
      .then((res) => res.json())
      .then((result) => {
        const logs: LogEntry[] = result.logs || [];
        const byDate = new Map<string, { date: string; saudáveis: number; avisos: number; críticos: number }>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = toYMD(d);
          const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
          byDate.set(key, { date: label, saudáveis: 0, avisos: 0, críticos: 0 });
        }
        logs.forEach((log) => {
          if (!log.checkedAt?.seconds) return;
          const logDate = new Date(log.checkedAt.seconds * 1000);
          const key = toYMD(logDate);
          const entry = byDate.get(key);
          if (!entry) return;
          if (log.status === "Healthy") entry.saudáveis += 1;
          else if (log.status === "Warning") entry.avisos += 1;
          else if (log.status === "Critical") entry.críticos += 1;
        });
        setData(Array.from(byDate.values()));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const hasData = data.some((d) => d.saudáveis + d.avisos + d.críticos > 0);

  return (
    <Card className="col-span-full xl:col-span-4">
      <CardHeader>
        <CardTitle>Visão geral de uptime</CardTitle>
        <p className="text-sm text-muted-foreground">
          Verificações dos últimos 7 dias (saudáveis, avisos e críticos por dia).
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] w-full bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
            <span className="text-sm text-slate-500">Carregando…</span>
          </div>
        ) : !hasData ? (
          <div className="h-[300px] w-full bg-slate-50 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 text-slate-500">
            <BarChart3 className="w-10 h-10" />
            <span className="text-sm">Execute as verificações em Monitoramento para gerar dados.</span>
          </div>
        ) : (
          <div className="h-[300px] w-full font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="currentColor" />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="saudáveis" stackId="a" fill="#10b981" name="Saudáveis" />
                <Bar dataKey="avisos" stackId="a" fill="#f59e0b" name="Avisos" />
                <Bar dataKey="críticos" stackId="a" fill="#ef4444" name="Críticos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
