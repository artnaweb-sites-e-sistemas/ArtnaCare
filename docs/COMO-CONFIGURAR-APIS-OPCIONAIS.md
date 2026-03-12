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

## WordPress (plugins e versão)

Para o ArtnaCare **reconhecer o WordPress** e listar plugins (e, opcionalmente, plugins desatualizados), cada site do tipo WordPress pode ter **credenciais** cadastradas no próprio site (ao editar o site no menu Sites).

**O que faz no projeto:**
- Sem credenciais: o sistema só detecta se o site é WordPress (REST API pública) e mostra versão como "Detected".
- Com credenciais: usa a **REST API do WordPress** com autenticação para ler a lista de plugins e a versão do WP. Se o site tiver um endpoint opcional (veja abaixo), também mostra **quantos plugins estão desatualizados**.

**Como configurar no site (por site):**

1. No WordPress (versão 5.6 ou superior), crie uma **Senha de aplicação** (Application Password):
   - Acesse **Usuários → Perfil** (do usuário admin ou um usuário com permissão para gerenciar plugins).
   - Role até **Senhas de aplicação**.
   - Digite um nome (ex.: "ArtnaCare") e clique em **Adicionar nova senha de aplicação**.
   - Copie a senha gerada (formato: `xxxx xxxx xxxx xxxx xxxx xxxx` — pode colar com ou sem espaços).

2. No ArtnaCare, em **Sites**, edite o site WordPress e preencha:
   - **URL do WP Admin**: ex. `https://seusite.com.br/wp-admin`
   - **Usuário do WP Admin**: o **nome de usuário** do WordPress (não o e-mail).
   - **Senha do WP Admin**: cole a **Senha de aplicação** gerada no passo 1 (não use a senha normal de login).

3. Salve. Ao rodar **Executar todas as verificações** (ou a verificação individual do site), o ArtnaCare usará essa senha para chamar a API do WordPress e obter a lista de plugins e a versão do core.

**Plugins desatualizados (opcional):**

O número de **plugins desatualizados** só aparece se o site WordPress expuser um endpoint opcional. Duas opções:

- **Opção A:** Usar o plugin em `docs/wordpress-plugin/artnacare-updates.php`: copie para `wp-content/plugins/artnacare-updates/` no WordPress e ative. Ele expõe `GET /wp-json/artnacare/v1/updates` retornando `{ "plugins_outdated": 5 }`. Use a mesma Senha de aplicação no ArtnaCare.
- **Opção B:** Deixar sem esse endpoint: o ArtnaCare continua mostrando a lista de plugins e a versão do WP; o contador de desatualizados ficará em zero.

**Resumo:** Para “relacionar” o site com o WordPress e reconhecer plugins, cadastre no site a **URL do admin**, o **usuário** e a **Senha de aplicação**. Para ver também **quantos plugins estão desatualizados**, é necessário um endpoint opcional no WordPress (ex.: plugin que devolva `plugins_outdated`).

---

## Resend (e-mail para relatórios)

**O que faz no projeto:** Envia os relatórios mensais por e-mail aos clientes (em Relatórios ou pelo botão na tela Sites).

**Por que aparece "Falha no envio" / "You can only send testing emails to your own email address":**

Em modo **sandbox** (conta grátis), o Resend **só permite enviar para o próprio e-mail da conta** (ex.: artnawebconta@gmail.com). Para enviar para **outros destinatários** (e-mails dos clientes), é obrigatório:

1. **Verificar um domínio** no Resend: [resend.com/domains](https://resend.com/domains) → adicione seu domínio (ex.: `artnacare.com`) e configure os registros DNS que o Resend indicar.
2. **Alterar o endereço "from":** No `.env.local`, defina `RESEND_FROM_EMAIL` com um e-mail **desse domínio verificado**, por exemplo:
   ```env
   RESEND_FROM_EMAIL="relatorios@seudominio.com"
   ```
   Não use `onboarding@resend.dev` para envios reais; esse endereço é só para testes e continua sujeito à regra do sandbox.

**Resumo:** Para enviar relatórios para os clientes, verifique um domínio em [resend.com/domains](https://resend.com/domains) e use um `from` com esse domínio. Caso contrário, o Resend só aceita envio para o seu próprio e-mail.

**Outras causas de falha:**
- **Spam:** Verifique a pasta de spam do destinatário.
- **API Key:** Confirme que `RESEND_API_KEY` está correta no `.env.local` (e na Vercel, se fizer deploy).

**Como configurar:**

1. Crie conta em [resend.com](https://resend.com).
2. Obtenha a API Key em **API Keys**.
3. No `.env.local`:
   ```env
   RESEND_API_KEY="re_..."
   RESEND_FROM_EMAIL="onboarding@resend.dev"
   ```
   Para **enviar para clientes**, verifique um domínio no Resend e use um e-mail desse domínio em `RESEND_FROM_EMAIL` (ex.: `relatorios@artnacare.com`).

---

## Resumo

| Variável              | Obrigatória? | Onde obter                          | Onde colocar        |
|-----------------------|-------------|-------------------------------------|---------------------|
| `UPTIMEROBOT_API_KEY` | Não         | UptimeRobot → My Settings → API Settings | `.env.local` e Vercel |
| `SUCURI_API_KEY`      | Não         | Código atual não usa; deixe vazio  | Pode deixar vazio   |
| `RESEND_API_KEY`      | Não         | Resend → API Keys                  | `.env.local` e Vercel |

Só insira **UPTIMEROBOT_API_KEY** se você for usar monitores do UptimeRobot. **SUCURI_API_KEY** pode ficar vazio. **RESEND_API_KEY** é necessário para enviar relatórios por e-mail. As credenciais do WordPress são configuradas **por site** ao editar o site no menu Sites.
