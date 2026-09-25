import {NextResponse} from 'next/server'
export async function POST(){return NextResponse.json({error:'O gerenciamento pelo Stripe foi desativado. Entre em contato com o suporte para gerenciar a assinatura.'},{status:410})}
