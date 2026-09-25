import {NextRequest,NextResponse} from 'next/server'
import {createHmac,timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
const validPlans=['pro','premium']
export async function POST(req:NextRequest){
 const secret=process.env.STRIPE_WEBHOOK_SECRET,key=process.env.STRIPE_SECRET_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!secret||!key||!url||!service)return NextResponse.json({error:'Webhook not configured'},{status:503})
 const header=req.headers.get('stripe-signature')||''
 const parts=Object.fromEntries(header.split(',').map(x=>x.trim().split('=',2)))
 const timestamp=parts.t||''
 const signatures=header.split(',').filter(x=>x.trim().startsWith('v1=')).map(x=>x.trim().slice(3))
 if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300||!signatures.length)return NextResponse.json({error:'Invalid signature'},{status:400})
 const raw=await req.text()
 const expected=createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex')
 if(!signatures.some(sig=>/^[a-f0-9]{64}$/i.test(sig)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(sig,'hex'))))return NextResponse.json({error:'Invalid signature'},{status:400})
 let event:any;try{event=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 const type=String(event?.type||'')
 if(!['checkout.session.completed','invoice.paid','customer.subscription.updated','customer.subscription.deleted'].includes(type))return NextResponse.json({ok:true})
 const obj=event?.data?.object||{}
 let subscriptionId=type==='checkout.session.completed'?obj.subscription:type==='invoice.paid'?obj.subscription:obj.id
 if(!subscriptionId||typeof subscriptionId!=='string')return NextResponse.json({ok:true})
 const res=await fetch('https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(subscriptionId),{headers:{Authorization:'Bearer '+key},cache:'no-store'})
 if(!res.ok)return NextResponse.json({error:'Stripe lookup failed'},{status:502})
 const subscription=await res.json()
 const userId=String(subscription.metadata?.user_id||'')
 const plan=String(subscription.metadata?.plan||'')
 if(!/^[0-9a-f-]{36}$/i.test(userId)||!validPlans.includes(plan))return NextResponse.json({ok:true})
 const configuredPrice=process.env[plan==='pro'?'STRIPE_PRICE_PRO':'STRIPE_PRICE_PREMIUM']
 const actualPrices=(subscription.items?.data||[]).map((item:any)=>item.price?.id)
 if(!configuredPrice||!actualPrices.includes(configuredPrice))return NextResponse.json({error:'Price mismatch'},{status:403})
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:{user},error:userError}=await admin.auth.admin.getUserById(userId)
 if(userError||!user?.email)return NextResponse.json({error:'User missing'},{status:403})
 const customerRes=await fetch('https://api.stripe.com/v1/customers/'+encodeURIComponent(String(subscription.customer)),{headers:{Authorization:'Bearer '+key},cache:'no-store'})
 if(!customerRes.ok)return NextResponse.json({error:'Customer lookup failed'},{status:502})
 const customer=await customerRes.json()
 if(String(customer.email||'').toLowerCase()!==user.email.toLowerCase())return NextResponse.json({error:'Customer mismatch'},{status:403})
 const {data:record,error:readError}=await admin.from('subscriptions').select('user_id,subscription_status,plan').eq('user_id',userId).maybeSingle()
 if(readError||!record)return NextResponse.json({error:'Subscription record missing'},{status:500})
 const status=String(subscription.status||'')
 // Never grant paid access from an unverified checkout redirect or an unpaid invoice.
 const paid=status==='active'&&subscription.latest_invoice
 let invoicePaid=false
 if(paid){const invoiceRes=await fetch('https://api.stripe.com/v1/invoices/'+encodeURIComponent(String(subscription.latest_invoice)),{headers:{Authorization:'Bearer '+key},cache:'no-store'});if(invoiceRes.ok){const invoice=await invoiceRes.json();invoicePaid=invoice.paid===true&&invoice.subscription===subscriptionId}}
 const newStatus=invoicePaid?'active':status==='canceled'?'canceled':status==='unpaid'||status==='incomplete_expired'?'expired':null
 if(!newStatus)return NextResponse.json({ok:true})
 const {error:write}=await admin.from('subscriptions').update({plan,subscription_status:newStatus,updated_at:new Date().toISOString()}).eq('user_id',userId)
 if(write)return NextResponse.json({error:'Database update failed'},{status:500})
 return NextResponse.json({ok:true})
}
