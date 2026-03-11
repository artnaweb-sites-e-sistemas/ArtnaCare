# Corrigir erro "api-key-not-valid" no login (Vercel)

O erro **Firebase: Error (auth/api-key-not-valid-please-pass-a-valid-api-key)** na Vercel geralmente acontece por um destes motivos:

---

## 1. Variáveis de ambiente na Vercel

As variáveis do Firebase precisam estar configuradas no projeto da Vercel.

**Passos:**

1. Acesse [vercel.com](https://vercel.com) → seu projeto **artna-care**
2. Vá em **Settings** → **Environment Variables**
3. Adicione **todas** as variáveis do Firebase (para **Production**, **Preview** e **Development**):

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Sua API key (ex.: `AIzaSy...`) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `artnacare.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `artnacare` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `artnacare.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `918393791841` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:918393791841:web:...` |

4. Depois de salvar, faça um **Redeploy** do projeto (Deployments → ⋮ no último deploy → Redeploy).

---

## 2. Restrições da API Key no Google Cloud

Se a API key do Firebase tiver **restrições de HTTP referrer**, o domínio da Vercel precisa estar na lista.

**Passos:**

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione o projeto **artnacare**
3. Vá em **APIs & Services** → **Credentials**
4. Clique na **API key** usada pelo Firebase (geralmente "Browser key" ou similar)
5. Em **Application restrictions**, se estiver em **HTTP referrers**, adicione:
   - `https://artna-care.vercel.app/*`
   - `https://*.vercel.app/*` (para previews)
6. Salve

---

## 3. Domínio autorizado no Firebase Auth

Você já adicionou o domínio no Firebase Authentication. Confirme se está assim:

1. [Firebase Console](https://console.firebase.google.com/) → projeto **artnacare**
2. **Authentication** → **Settings** → **Authorized domains**
3. Verifique se existe:
   - `artna-care.vercel.app`
   - `localhost` (para desenvolvimento)

---

## Resumo

1. Variáveis `NEXT_PUBLIC_FIREBASE_*` configuradas na Vercel  
2. Redeploy após adicionar as variáveis  
3. API key sem restrição ou com `artna-care.vercel.app` nos referrers  
4. Domínio na lista de Authorized domains do Firebase Auth  

Depois disso, o login deve funcionar em `https://artna-care.vercel.app/login`.
