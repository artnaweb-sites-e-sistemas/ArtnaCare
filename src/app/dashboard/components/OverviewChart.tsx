import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function OverviewChart() {
  return (
    <Card className="col-span-full xl:col-span-4">
      <CardHeader>
        <CardTitle>Visão geral de uptime</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Placeholder for an actual chart component like Recharts */}
        <div className="h-[300px] w-full bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <BarChart3 className="w-10 h-10" />
            <span>Visualização do gráfico</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
