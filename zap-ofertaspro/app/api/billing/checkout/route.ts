import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
const prices={pro:'STRIPE_PRICE_PRO',premium:'STRIPE_PRICE_PREMIUM'} as const
const stripe=async(path:string,params:URLSearchParams,key:string)=>{const res=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString(),cache:'no-store'});const json=await res.json();if(!res.ok)throw Error(json?.error?.message||'Erro ao iniciar pagamento na Stripe.');return json}
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.STRIPE_SECRET_KEY
  if(!token)return NextResponse.json({error:'Entre na sua conta.'},{status:401})
  if(!url||!anon||!key)return NextResponse.json({error:'A Stripe ainda não foi configurada pelo administrador.'},{status:503})
  const db=createClient(url,anon,{auth:{persistSession:false}})
  const {data:{user},error}=await db.auth.getUser(token)
  if(error||!user?.email)return NextResponse.json({error:'Sessão inválida.'},{status:401})
  const body=await req.json();const plan=body?.plan as keyof typeof prices
  if(!Object.hasOwn(prices,plan)||body?.confirmImmediate!==true)return NextResponse.json({error:'Confirme o plano e a cobrança imediata.'},{status:400})
  const price=process.env[prices[plan]]
  if(!price||!/^price_[a-zA-Z0-9]+$/.test(price))return NextResponse.json({error:'O preço deste plano ainda não foi configurado na Stripe.'},{status:503})
  const {data:current}=await db.from('subscriptions').select('subscription_status').eq('user_id',user.id).maybeSingle()
  if(current?.subscription_status==='active')return NextResponse.json({error:'Você já tem uma assinatura ativa. Use o gerenciamento da assinatura.'},{status:409})
  const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin
  const params=new URLSearchParams()
  params.set('mode','subscription');params.set('payment_method_types[0]','card')
  params.set('line_items[0][price]',price);params.set('line_items[0][quantity]','1')
  params.set('client_reference_id',user.id);params.set('customer_email',user.email)
  params.set('subscription_data[metadata][user_id]',user.id)
  params.set('subscription_data[metadata][plan]',plan)
  params.set('metadata[user_id]',user.id);params.set('metadata[plan]',plan)
  params.set('success_url',origin+'/?billing=success&session_id={CHECKOUT_SESSION_ID}')
  params.set('cancel_url',origin+'/?billing=cancel')
  const session=await stripe('checkout/sessions',params,key)
  if(!session.url)return NextResponse.json({error:'A Stripe não retornou um link de pagamento.'},{status:502})
  return NextResponse.json({url:session.url})
 }catch(e){console.error('Stripe checkout failed',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'Não foi possível iniciar a assinatura. Verifique os preços e a configuração da Stripe.'},{status:502})}
}
