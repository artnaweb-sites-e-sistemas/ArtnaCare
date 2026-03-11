import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const recentSites = [
  { id: "1", name: "Acme Corp Website", url: "acmecorp.com", status: "online", client: "Acme Corp" },
  { id: "2", name: "Global Industries portal", url: "portal.globalind.com", status: "offline", client: "Global Industries" },
  { id: "3", name: "TechNova Blog", url: "blog.technova.dev", status: "degraded", client: "TechNova" },
  { id: "4", name: "Beta LLC Store", url: "shop.betallc.co", status: "online", client: "Beta LLC" },
];

export function RecentSitesTable() {
  return (
    <Card className="col-span-full xl:col-span-3">
      <CardHeader>
        <CardTitle>Recent Sites</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentSites.map(site => (
            <div key={site.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-slate-800">{site.name}</span>
                <span className="text-sm text-slate-500">{site.url}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500 hidden sm:block">{site.client}</span>
                {site.status === "online" && <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Online</Badge>}
                {site.status === "offline" && <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200"><XCircle className="w-3 h-3 mr-1" /> Offline</Badge>}
                {site.status === "degraded" && <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Degraded</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
