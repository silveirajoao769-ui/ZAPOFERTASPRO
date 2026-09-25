import {NextResponse} from 'next/server'
export const runtime='nodejs'
export async function POST(){
 return NextResponse.json({error:'As assinaturas estão sendo migradas para o Asaas. A contratação ficará disponível após configurar a integração de produção.'},{status:503})
}
