"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Globe, Activity, AlertTriangle, XCircle } from "lucide-react";
import { getClients } from "@/lib/firebase/firestore";
import { getSites } from "@/lib/firebase/sites";

export function MetricsCards() {
  const [clients, setClients] = useState<{ id?: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [clientsData, sitesData] = await Promise.all([getClients(), getSites()]);
        setClients(clientsData);
        setSites(sitesData);
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const onlineSites = sites.filter((s) => s.status === "Healthy" || s.status === "Warning");
  const onlinePercentage =
    sites.length > 0 ? Math.round((onlineSites.length / sites.length) * 100) : 0;
  const warningsCount = sites.filter((s) => s.status === "Warning").length;
  const criticalCount = sites.filter((s) => s.status === "Critical").length;

  const metrics = [
    {
      title: "Total de clientes",
      value: loading ? "—" : clients.length.toString(),
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-100",
    },
    {
      title: "Sites ativos",
      value: loading ? "—" : sites.length.toString(),
      icon: Globe,
      color: "text-indigo-500",
      bg: "bg-indigo-100",
    },
    {
      title: "Status online",
      value: loading ? "—" : `${onlinePercentage}%`,
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-100",
    },
    {
      title: "Avisos",
      value: loading ? "—" : warningsCount.toString(),
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-100",
    },
    {
      title: "Alertas críticos",
      value: loading ? "—" : criticalCount.toString(),
      icon: XCircle,
      color: "text-rose-500",
      bg: "bg-rose-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {metrics.map((m, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
            <div className={`p-2 rounded-full ${m.bg}`}>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
