"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteForm from "@/components/sites/SiteForm"
import { toast } from "sonner"

function NewSiteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const clientId = searchParams.get("clientId") || undefined

  useEffect(() => {
    if (!clientId) {
      toast.info("Para adicionar um site, é necessário vincular a um cliente. Selecione um cliente e clique em \"Adicionar site\".")
      router.replace("/dashboard/clients")
    }
  }, [clientId, router])

  if (!clientId) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Redirecionando para clientes…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar para o cliente</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Adicionar novo site</h2>
          <p className="text-muted-foreground">Registre um novo site para monitoramento. O site fica vinculado ao cliente selecionado.</p>
        </div>
      </div>

      <SiteForm key={clientId} defaultClientId={clientId} />
    </div>
  )
}

export default function NewSitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>}>
      <NewSiteContent />
    </Suspense>
  )
}
