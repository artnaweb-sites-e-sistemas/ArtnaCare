"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { getSites } from "@/lib/firebase/sites";
import { getClients } from "@/lib/firebase/firestore";
import type { Site } from "@/lib/firebase/sites";
import type { Client } from "@/lib/firebase/firestore";

export function RecentSitesTable() {
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sitesData, clientsData] = await Promise.all([
          getSites(),
          getClients(),
        ]);
        setAllSites(sitesData);
        setAllClients(clientsData);
      } catch (error) {
        console.error("Erro ao carregar sites:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const recentSites = allSites.slice(0, 4);

  return (
    <Card className="col-span-full xl:col-span-3">
      <CardHeader>
        <CardTitle>Sites recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && (
            <p className="text-sm text-slate-500 text-center py-4">
              Carregando sites...
            </p>
          )}
          {!loading && recentSites.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              Nenhum site encontrado.
            </p>
          )}
          {!loading &&
            recentSites.map((site) => {
              const client = allClients.find((c) => c.id === site.clientId);
              return (
                <div
                  key={site.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-white"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-800">
                      {site.name}
                    </span>
                    <span className="text-sm text-slate-500">{site.url}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-500 hidden sm:block">
                      {client ? client.name : site.clientId}
                    </span>
                    {site.status === "Healthy" && (
                      <Badge
                        variant="outline"
                        className="text-emerald-600 bg-emerald-50 border-emerald-200"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Saudável
                      </Badge>
                    )}
                    {site.status === "Critical" && (
                      <Badge
                        variant="outline"
                        className="text-rose-600 bg-rose-50 border-rose-200"
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Crítico
                      </Badge>
                    )}
                    {site.status === "Warning" && (
                      <Badge
                        variant="outline"
                        className="text-amber-600 bg-amber-50 border-amber-200"
                      >
                        <AlertCircle className="w-3 h-3 mr-1" /> Aviso
                      </Badge>
                    )}
                    {site.status === "Unknown" && (
                      <Badge
                        variant="outline"
                        className="text-slate-600 bg-slate-50 border-slate-200"
                      >
                        <AlertCircle className="w-3 h-3 mr-1" /> Desconhecido
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
