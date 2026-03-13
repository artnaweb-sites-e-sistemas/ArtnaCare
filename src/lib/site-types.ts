/**
 * Retorna o rótulo em português do tipo de site para exibição na interface.
 */
export function getSiteTypeLabel(type: string | null | undefined): string {
  if (!type) return "—"
  switch (type) {
    case "WordPress":
      return "WordPress"
    case "Static":
      return "Estático"
    case "Other":
      return "Outros"
    default:
      return type
  }
}
