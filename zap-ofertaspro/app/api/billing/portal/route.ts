import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 const key=process.env.STRIPE_SECRET_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!key||!url||!anon)return NextResponse.json({error:'Portal não configurado.'},{status:503})
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!token)return NextResponse.json({error:'Entre na sua conta.'},{status:401})
 const db=createClient(url,anon,{auth:{persistSession:false}})
 const {data:{user}}=await db.auth.getUser(token)
 if(!user?.email)return NextResponse.json({error:'Sessão inválida.'},{status:401})
 const params=new URLSearchParams({email:user.email,limit:'20'})
 const customersRes=await fetch('https://api.stripe.com/v1/customers?'+params.toString(),{headers:{Authorization:'Bearer '+key},cache:'no-store'})
 if(!customersRes.ok)return NextResponse.json({error:'Falha ao consultar sua assinatura.'},{status:502})
 const customers=await customersRes.json()
 let customerId:string|undefined
 for(const c of customers.data||[]){const subscriptionsRes=await fetch('https://api.stripe.com/v1/subscriptions?'+new URLSearchParams({customer:c.id,status:'all',limit:'10'}),{headers:{Authorization:'Bearer '+key},cache:'no-store'});if(!subscriptionsRes.ok)continue;const subscriptions=await subscriptionsRes.json();if((subscriptions.data||[]).some((s:any)=>s.metadata?.user_id===user.id)){customerId=c.id;break}}
 if(!customerId)return NextResponse.json({error:'Nenhuma assinatura Stripe encontrada para sua conta.'},{status:404})
 const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin
 const res=await fetch('https://api.stripe.com/v1/billing_portal/sessions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({customer:customerId,return_url:origin+'/?billing=return'}).toString()})
 const portal=await res.json()
 if(!res.ok||!portal.url)return NextResponse.json({error:'Ative o portal do cliente no painel Stripe para gerenciar assinaturas.'},{status:502})
 return NextResponse.json({url:portal.url})
}
