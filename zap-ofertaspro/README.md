# ZAP OfertasPro 1.2

Next.js 14 + Supabase opcional. Produtos, anúncios e agenda funcionam localmente sem configuração.

## Rodar localmente

```bash
npm install
npm run dev
```

## Ativar login e backup na nuvem

1. Crie um projeto no Supabase e execute `supabase.sql` no SQL Editor.
2. Copie `.env.example` para `.env.local` e preencha URL e **chave pública anon** de Project Settings > API. Nunca use service_role no frontend.
3. Reinicie o servidor. Em Minha conta, cadastre-se e confirme seu e-mail se solicitado.
4. Exporte um backup JSON antes da primeira sincronização. Use **Salvar dados na nuvem** para enviar dados locais ou **Restaurar dados da nuvem** para substituir dados locais, com confirmação. A sincronização é manual.
5. Na Vercel, configure as duas variáveis de ambiente e redeploy. Em Supabase Authentication > URL Configuration, configure Site URL com o domínio Vercel e URLs de redirecionamento necessárias.

## Limitações

Não há cobrança, IA externa, rastreamento de vendas, publicação automática ou vitrine pública. O backup remoto é um documento JSON por usuário, protegido por RLS. Se o Supabase não estiver configurado, o app permanece 100% local. Hospedagem comercial exige verificar os termos do plano contratado.
