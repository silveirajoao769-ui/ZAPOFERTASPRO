import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
const prices={pro:29.90,premium:59.90} as const
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,mp=process.env.MERCADOPAGO_ACCESS_TOKEN
  if(!token)return NextResponse.json({error:'Entre na sua conta.'},{status:401})
  if(!url||!key||!mp)return NextResponse.json({error:'Pagamentos ainda não configurados. Entre em contato com o suporte.'},{status:503})
  const supabase=createClient(url,key,{auth:{persistSession:false}})
  const {data:{user},error}=await supabase.auth.getUser(token)
  if(error||!user?.email)return NextResponse.json({error:'Sessão inválida.'},{status:401})
  const {plan,confirmImmediate}=await req.json()
  if(!(plan in prices)||confirmImmediate!==true)return NextResponse.json({error:'Selecione um plano e confirme a cobrança imediata.'},{status:400})
  const {data:subscription}=await supabase.from('subscriptions').select('plan,subscription_status').eq('user_id',user.id).maybeSingle()
  if(subscription?.subscription_status==='active')return NextResponse.json({error:'Você já possui assinatura ativa. Use o gerenciamento de assinatura.'},{status:409})
  const origin=new URL(req.url).origin
  const res=await fetch('https://api.mercadopago.com/preapproval',{method:'POST',headers:{Authorization:'Bearer '+mp,'Content-Type':'application/json','X-Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({reason:'ZAP OfertasPro '+(plan==='pro'?'Pro':'Premium'),external_reference:'zap:'+user.id+':'+plan,payer_email:user.email,auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:prices[plan as keyof typeof prices],currency_id:'BRL'},back_url:origin+'/?billing=return',status:'pending'})})
  const result=await res.json()
  if(!res.ok){const code=String(result?.error||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,45);const cause=String(result?.cause?.[0]?.code||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,45);const message=String(result?.message||'').replace(/[\r\n]/g,' ').slice(0,200);const detail=String(result?.cause?.[0]?.description||'').replace(/[\r\n]/g,' ').slice(0,200);console.error('Mercado Pago preapproval rejected',{httpStatus:res.status,code,cause,message,detail,credentialMode:mp.startsWith('TEST-')?'test':'production'});const msg=res.status===401?'Credencial do Mercado Pago inválida ou incompatível. Confira o Access Token na Vercel.':res.status===403?'A conta Mercado Pago não autorizou a criação de assinaturas. Confira as permissões e o ambiente de teste.':res.status===400?'O Mercado Pago recusou os dados da assinatura. Estamos identificando o motivo exato.':'Mercado Pago indisponível. Tente novamente mais tarde.';return NextResponse.json({error:msg,diagnostic:code+(cause?'/'+cause:'')},{status:502})}
  const checkoutUrl=result.sandbox_init_point&&mp.startsWith('TEST-')?result.sandbox_init_point:result.init_point
  if(!checkoutUrl||!/^https:\/\//.test(checkoutUrl)){console.error('Mercado Pago preapproval missing checkout URL',{hasId:!!result.id,test:mp.startsWith('TEST-')});return NextResponse.json({error:'O Mercado Pago não retornou o link de pagamento.',diagnostic:'missing_checkout_url'},{status:502})}
  return NextResponse.json({url:checkoutUrl})
 }catch{return NextResponse.json({error:'Erro ao iniciar pagamento.'},{status:500})}
}
