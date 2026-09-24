# ZAP OfertasPro — MVP gratuito

Aplicativo Next.js 14 + Tailwind CSS para organizar achadinhos e criar anúncios de afiliados.

## Funciona agora
- Cadastro e exclusão de produtos, com links de afiliado
- Textos editáveis para WhatsApp, Instagram e roteiros curtos de vídeo (templates, sem IA externa)
- Compartilhamento manual via WhatsApp
- Biblioteca de anúncios, agenda manual e vitrine local
- Persistência no navegador com localStorage

## Instalação
1. Instale Node.js 20 ou superior.
2. Execute `npm install` e `npm run dev`.
3. Abra http://localhost:3000.

## GitHub + Vercel
1. Crie um repositório privado no GitHub e envie os arquivos desta pasta (sem `node_modules`).
2. Na Vercel, clique em **Add New → Project**, importe o repositório e mantenha o framework Next.js.
3. Clique em **Deploy**. Cada novo push no GitHub atualizará a versão publicada.

**Atenção:** esta versão é uma demonstração pessoal, não um SaaS multiusuário. Os dados ficam apenas no navegador, não são sincronizados entre dispositivos e podem ser perdidos se o armazenamento for apagado. Não há login, pagamento, IA externa, rastreamento de vendas ou envio automático de mensagens. Antes de vender assinaturas, conectar Supabase com autenticação e regras RLS, backend de limites por plano e provedor de pagamentos. Confira os termos atuais da Vercel: o plano Hobby pode restringir uso comercial; para lançar um serviço pago, verifique um plano/host compatível.
