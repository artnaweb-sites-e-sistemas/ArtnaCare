import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Globe, Activity, AlertTriangle, Blocks } from "lucide-react";

export function MetricsCards() {
  const metrics = [
    { title: "Total Clients", value: "24", icon: Users, color: "text-blue-500", bg: "bg-blue-100" },
    { title: "Active Sites", value: "32", icon: Globe, color: "text-indigo-500", bg: "bg-indigo-100" },
    { title: "Online Status", value: "98.5%", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-100" },
    { title: "Active Alerts", value: "3", icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-100" },
    { title: "Plugin Updates", value: "12", icon: Blocks, color: "text-amber-500", bg: "bg-amber-100" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {metrics.map((m, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {m.title}
            </CardTitle>
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
