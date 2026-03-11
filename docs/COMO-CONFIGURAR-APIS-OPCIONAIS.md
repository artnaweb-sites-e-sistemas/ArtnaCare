# Como configurar as APIs opcionais (UptimeRobot e Sucuri)

Essas chaves **não são obrigatórias**. O ArtnaCare funciona normalmente sem elas. Só configure se quiser usar essas integrações.

---

## UptimeRobot (monitores de uptime externos)

**O que faz no projeto:**
- Ao **cadastrar um site** na ArtnaCare, um monitor é criado automaticamente no UptimeRobot (se a API key estiver configurada).
- A seção **Monitores UptimeRobot** na tela de Monitoramento mostra **apenas** os sites cadastrados na ArtnaCare (não monitores criados manualmente fora do sistema).
- Sites existentes sem monitor podem ser sincronizados com o botão "Sincronizar" na tela de Monitoramento.

**Como obter a API Key:**

1. Acesse [uptimerobot.com](https://uptimerobot.com) e crie uma conta (ou faça login).
2. No dashboard, clique no seu **avatar/nome** (canto superior direito) → **My Settings**.
3. Aba **API Settings**.
4. Em **Main API Key**, clique em **Show** e copie a chave (formato longo, ex.: `u123456-7890abcdef...`).

**Onde colocar:**

- **Local:** no arquivo `.env.local` na raiz do projeto:
  ```env
  UPTIMEROBOT_API_KEY="sua_chave_aqui"
  ```
- **Vercel:** no projeto → **Settings** → **Environment Variables** → adicione `UPTIMEROBOT_API_KEY` com o mesmo valor.

Depois disso, qualquer parte do app que chame `getUptimeRobotMonitors()` passará a usar seus monitores do UptimeRobot.

---

## Sucuri (verificação de malware)

**O que faz no projeto:** A função `checkSucuri(url)` em `src/lib/integrations.ts` usa o **SiteCheck público** da Sucuri (`https://sitecheck.sucuri.net/api/v3/`). Esse endpoint **não usa** a variável `SUCURI_API_KEY` no código atual.

**Conclusão:** Hoje você **não precisa** preencher `SUCURI_API_KEY` para a checagem de malware que está no código. Pode deixar vazio no `.env.local` e na Vercel.

Se no futuro o projeto usar alguma API **paga** ou **autenticada** da Sucuri (ex.: API do dashboard), aí sim será preciso:

1. Ter conta/plano na Sucuri que forneça API key.
2. Adicionar no `.env.local` e na Vercel:
   ```env
   SUCURI_API_KEY="sua_chave_aqui"
   ```

---

## Resumo

| Variável              | Obrigatória? | Onde obter                          | Onde colocar        |
|-----------------------|-------------|-------------------------------------|---------------------|
| `UPTIMEROBOT_API_KEY` | Não         | UptimeRobot → My Settings → API Settings | `.env.local` e Vercel |
| `SUCURI_API_KEY`      | Não         | Código atual não usa; deixe vazio  | Pode deixar vazio   |

Só insira **UPTIMEROBOT_API_KEY** se você for usar monitores do UptimeRobot no app. **SUCURI_API_KEY** pode ficar em branco.
