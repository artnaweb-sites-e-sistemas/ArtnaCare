# Próximos passos: API de monitoramento e envio de relatórios por e-mail

Guia do que você precisa fazer para:
1. **Executar as verificações de monitoramento** (e ver resultados no painel)
2. **Enviar relatórios por e-mail** aos clientes

---

## Parte 1: API de monitoramento (Executar verificações)

### O que já existe no código
- **POST /api/cron/monitoring**: percorre todos os sites, chama `runAllChecks` (HTTP, SSL, WordPress), atualiza status no Firestore e grava em `monitoring_logs`.
- **Botão "Executar todas as verificações"** na tela de Monitoramento chama esse endpoint.

### Problema atual
As rotas de API rodam **no servidor** (Node.js). Elas usam o Firebase **client** (navegador). No servidor não há usuário logado, então o Firestore nega acesso com *"Missing or insufficient permissions"*.

### O que você precisa fazer

#### Opção A – Testar pelo navegador (rápido)
1. Na tela **Monitoramento**, clique em **"Executar todas as verificações"**.
2. A requisição sai **do seu navegador** (você está logado).  
   Porém o **endpoint** ainda usa Firestore no servidor, então o erro de permissão pode continuar.  
   Se quiser só validar a lógica de checks, use a Opção B e garanta que as rotas usem Admin SDK.

#### Opção B – Fazer as rotas de cron usarem Firebase Admin (recomendado)
1. Nas rotas **API** (`/api/cron/monitoring` e `/api/cron/reports`), trocar o uso do Firestore **client** pelo **Admin SDK** (`adminDb` em `src/lib/firebase/admin.ts`).
2. Ou seja: criar funções que leem/escrevem em **sites**, **clients** e **monitoring_logs** usando `adminDb`, e usar só essas funções dentro de `route.ts`.
3. Manter no `.env` (ou no Vercel):
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  
   (o Admin usa essas variáveis; a chave deve ter quebras de linha reais `\n`).

Depois disso, tanto o botão “Executar todas as verificações” quanto um CRON externo poderão chamar **POST /api/cron/monitoring** sem erro de permissão.

#### (Opcional) Agendar execução automática
- **Vercel**: criar `vercel.json` com um cron que chama `POST /api/cron/monitoring` (ex.: 1x por dia).
- **Outro servidor**: usar cron (Linux) ou Agendador de Tarefas (Windows) para fazer `curl -X POST https://seu-dominio.com/api/cron/monitoring` no horário desejado.
- **Segurança**: no código da rota, verificar um segredo (ex.: header `Authorization: Bearer SEU_CRON_SECRET`) e rejeitar se não bater. Colocar `CRON_SECRET` nas variáveis de ambiente.

---

## Parte 2: Enviar relatório por e-mail

### O que já existe no código
- **POST /api/cron/reports**: gera HTML do relatório, gera PDF (Puppeteer) e **pode** enviar e-mail com o PDF em anexo.
- O envio está **comentado** no código; ao configurar o Resend, basta descomentar e ajustar assunto/nome do anexo se quiser.

### Passo a passo

#### 1. Conta e API key no Resend
1. Acesse [resend.com](https://resend.com) e crie uma conta (ou faça login).
2. No dashboard: **API Keys** → **Create API Key**.
3. Copie a chave (começa com `re_`) e guarde em lugar seguro.

#### 2. Variáveis de ambiente
No `.env.local` (e no Vercel, se for deploy):

```env
RESEND_API_KEY="re_sua_chave_aqui"
RESEND_FROM_EMAIL="relatorios@seudominio.com"
```

- **RESEND_API_KEY**: obrigatório; sem ela o código nem tenta enviar.
- **RESEND_FROM_EMAIL**: e-mail remetente. No Resend você precisa **verificar o domínio** (ou usar o domínio de teste deles, ex.: `onboarding@resend.dev`).

#### 3. Verificar domínio no Resend (produção)
1. No Resend: **Domains** → **Add Domain** (ex.: `artnacare.com`).
2. Siga as instruções para adicionar os registros DNS (SPF, DKIM, etc.).
3. Use esse domínio no remetente, ex.: `relatorios@artnacare.com` em `RESEND_FROM_EMAIL`.

Para **teste**, você pode usar o domínio de exemplo do Resend (veja na doc deles) e um endereço tipo `onboarding@resend.dev` como `RESEND_FROM_EMAIL`.

#### 4. Ativar o envio no código
No arquivo **`src/app/api/cron/reports/route.ts`**:

1. Localize o bloco comentado que chama `sendEmail(...)`.
2. **Descomente** esse bloco (remova `/*` e `*/` e os comentários em volta).
3. (Opcional) Ajuste o **assunto** e o **nome do arquivo** do PDF para português, por exemplo:
   - `subject: \`Relatório de manutenção - \${period}\``
   - `filename: \`ArtnaCare_Relatorio_\${...}.pdf\``

Depois disso, ao chamar **POST /api/cron/reports** (manual ou por cron), o sistema tentará enviar um e-mail por cliente ativo com o relatório em anexo.

#### 5. Chamar a geração de relatórios
- **Manual**: no navegador ou com Postman/curl:  
  `POST https://seu-dominio.com/api/cron/reports`
- **Agendado**: configurar um cron (Vercel ou servidor) para chamar esse endpoint 1x por mês (ex.: dia 1 às 8h).

---

## Resumo rápido

| Objetivo                         | Ação principal                                                                 |
|----------------------------------|---------------------------------------------------------------------------------|
| Verificações de monitoramento    | Fazer as rotas de API usarem Firebase **Admin** em vez do client; testar o POST. |
| Envio de relatório por e-mail    | Configurar Resend (API key + from), verificar domínio, descomentar `sendEmail`. |
| Rodar tudo automaticamente       | Configurar cron (Vercel ou servidor) para `/api/cron/monitoring` e `/api/cron/reports`. |

Se quiser, posso te guiar na alteração do código das rotas para usar o Admin SDK (lista exata de arquivos e trechos a mudar).
