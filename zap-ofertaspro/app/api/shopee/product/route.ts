import {NextRequest,NextResponse} from 'next/server'
export const runtime='nodejs'

export async function POST(req:NextRequest){
 try{
  const {url}=await req.json()
  if(typeof url!=='string'||!/^https:\/\//i.test(url))return NextResponse.json({error:'Cole um link válido da Shopee.'},{status:400})
  let parsed:URL
  try{parsed=new URL(url)}catch{return NextResponse.json({error:'Link inválido.'},{status:400})}
  const host=parsed.hostname.toLowerCase()
  if(!(host==='shopee.com.br'||host.endsWith('.shopee.com.br')))return NextResponse.json({error:'Por enquanto, use um link da Shopee Brasil.'},{status:400})

  const appId=process.env.SHOPEE_AFFILIATE_APP_ID
  const secret=process.env.SHOPEE_AFFILIATE_SECRET
  if(!appId||!secret)return NextResponse.json({
   configured:false,
   validLink:true,
   url,
   message:'Link reconhecido. A integração oficial da Shopee ainda precisa das credenciais Affiliate Open API no servidor.'
  })

  // We intentionally do not scrape Shopee pages. The official Affiliate Open API
  // will be called here only after its exact operation/schema is verified for this app.
  return NextResponse.json({configured:true,validLink:true,url,message:'Credenciais configuradas. Conector oficial pronto para receber a operação de produto da Shopee Affiliate API.'})
 }catch{return NextResponse.json({error:'Não foi possível analisar o link.'},{status:500})}
}
