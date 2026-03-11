/**
 * Formata telefone para exibição: +55 (12) 99639-6744
 * Aceita string com ou sem formatação.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "—"
  const d = phone.replace(/\D/g, "")
  if (d.length < 10) return phone
  const withCountry = d.length === 11 ? "55" + d : d.length >= 12 ? d : d
  const digits = withCountry.slice(-11)
  const country = withCountry.length > 11 ? withCountry.slice(0, -11) : "55"
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  if (rest.length >= 8) {
    return `+${country} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
  }
  return phone
}

/**
 * Retorna apenas dígitos do telefone (para wa.me e armazenamento).
 */
export function getPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return ""
  return phone.replace(/\D/g, "")
}

/**
 * Formata em tempo real para o campo de input (máscara progressiva).
 * Ex.: "12" → "(12", "129" → "(12) 9", "12996396744" → "(12) 99639-6744"
 * Com 55: "+55 (12) 99639-6744"
 */
export function formatPhoneInputLive(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 13)
  if (d.length === 0) return ""
  const work = d.length > 11 ? d.slice(-11) : d
  const len = work.length
  if (len <= 2) return `(${work}`
  if (len <= 7) return `(${work.slice(0, 2)}) ${work.slice(2)}`
  const masked = `(${work.slice(0, 2)}) ${work.slice(2, 7)}-${work.slice(7)}`
  if (d.length <= 11) return masked
  return `+55 ${masked}`
}

/**
 * Aplica máscara enquanto o usuário digita (campo de input).
 * Retorna string apenas com dígitos, no máximo 13 (55 + 11).
 */
export function maskPhoneInput(value: string): string {
  const d = value.replace(/\D/g, "")
  if (d.length <= 11) return d
  return d.slice(0, 13)
}

/**
 * Normaliza para armazenar: 55 + DDD + 9 dígitos (13 dígitos).
 */
export function normalizePhoneForStore(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 13)
  if (d.length === 11) return "55" + d
  return d
}
