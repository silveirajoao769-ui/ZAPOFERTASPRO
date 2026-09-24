import './globals.css'
import type { Metadata } from 'next'
export const metadata: Metadata={title:'ZAP OfertasPro | Painel de afiliados',description:'Organize produtos e crie anúncios para seus achadinhos'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
