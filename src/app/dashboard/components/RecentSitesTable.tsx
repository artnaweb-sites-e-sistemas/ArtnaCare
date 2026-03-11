"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { getSites } from "@/lib/firebase/sites";
import { getClients } from "@/lib/firebase/firestore";
import type { Site } from "@/lib/firebase/sites";
import type { Client } from "@/lib/firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-emerald-600 bg-emerald-50 border-emerald-200"
                        >
                          Saudável
                        </Badge>
                        <Popover>
                          <PopoverTrigger asChild>
                            <span role="button" tabIndex={0} className="inline-flex cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Ver detalhes do status">
                              <Info className="h-4 w-4" />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 sm:w-80" align="end">
                            <p className="font-medium text-sm mb-2">Detalhes do status</p>
                            {site.issues && site.issues.length > 0 ? (
                              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                {site.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">Nenhum problema detectado.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {site.status === "Critical" && (
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-rose-600 bg-rose-50 border-rose-200"
                        >
                          Crítico
                        </Badge>
                        <Popover>
                          <PopoverTrigger asChild>
                            <span role="button" tabIndex={0} className="inline-flex cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Ver detalhes do status">
                              <Info className="h-4 w-4" />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 sm:w-80" align="end">
                            <p className="font-medium text-sm mb-2">Detalhes do status</p>
                            {site.issues && site.issues.length > 0 ? (
                              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                {site.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">Execute as verificações em Monitoramento para obter os detalhes.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {site.status === "Warning" && (
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-amber-600 bg-amber-50 border-amber-200"
                        >
                          Aviso
                        </Badge>
                        <Popover>
                          <PopoverTrigger asChild>
                            <span role="button" tabIndex={0} className="inline-flex cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Ver detalhes do status">
                              <Info className="h-4 w-4" />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 sm:w-80" align="end">
                            <p className="font-medium text-sm mb-2">Detalhes do status</p>
                            {site.issues && site.issues.length > 0 ? (
                              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                {site.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">Execute as verificações em Monitoramento para obter os detalhes.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {site.status === "Unknown" && (
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-slate-600 bg-slate-50 border-slate-200"
                        >
                          Desconhecido
                        </Badge>
                        <Popover>
                          <PopoverTrigger asChild>
                            <span role="button" tabIndex={0} className="inline-flex cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Ver detalhes do status">
                              <Info className="h-4 w-4" />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 sm:w-80" align="end">
                            <p className="font-medium text-sm mb-2">Detalhes do status</p>
                            {site.issues && site.issues.length > 0 ? (
                              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                {site.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">Execute as verificações em Monitoramento para obter os detalhes.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {!["Healthy", "Critical", "Warning", "Unknown"].includes(site.status || "") && (
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-slate-600 bg-slate-50 border-slate-200"
                        >
                          {site.status || "—"}
                        </Badge>
                        <Popover>
                          <PopoverTrigger asChild>
                            <span role="button" tabIndex={0} className="inline-flex cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Ver detalhes do status">
                              <Info className="h-4 w-4" />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 sm:w-80" align="end">
                            <p className="font-medium text-sm mb-2">Detalhes do status</p>
                            {site.issues && site.issues.length > 0 ? (
                              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                {site.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">Execute as verificações em Monitoramento para obter os detalhes.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
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
