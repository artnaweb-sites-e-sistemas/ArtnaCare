import ClientForm from "@/components/clients/ClientForm"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function NewClientPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar para clientes</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Adicionar novo cliente</h2>
          <p className="text-muted-foreground">Crie uma nova conta de cliente para gerenciar seus sites.</p>
        </div>
      </div>

      <ClientForm />
    </div>
  )
}
