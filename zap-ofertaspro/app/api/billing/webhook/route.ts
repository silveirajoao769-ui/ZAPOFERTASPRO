import {NextRequest,NextResponse} from 'next/server'
import {createHmac,timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 const access=process.env.MERCADOPAGO_ACCESS_TOKEN,secret=process.env.MERCADOPAGO_WEBHOOK_SECRET
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!access||!secret||!url||!service)return NextResponse.json({error:'Webhook not configured'},{status:503})
 const signature=req.headers.get('x-signature')||'',requestId=req.headers.get('x-request-id')||''
 const fields=Object.fromEntries(signature.split(',').map(x=>x.trim().split('=',2)))
 const ts=fields.ts||'',v1=fields.v1||''
 const dataId=req.nextUrl.searchParams.get('data.id')||req.nextUrl.searchParams.get('id')||''
 if(!requestId||!/^\d{10,16}$/.test(ts)||!dataId||!/^[0-9a-zA-Z-]{1,100}$/.test(dataId)||!/^[a-f0-9]{64}$/i.test(v1))return NextResponse.json({error:'Invalid signature'},{status:401})
 const timestamp=Number(ts);const millis=timestamp<1e12?timestamp*1000:timestamp
 if(Math.abs(Date.now()-millis)>10*60*1000)return NextResponse.json({error:'Expired signature'},{status:401})
 const manifest='id:'+dataId.toLowerCase()+';request-id:'+requestId+';ts:'+ts+';'
 const expected=createHmac('sha256',secret).update(manifest).digest('hex')
 if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(v1,'hex')))return NextResponse.json({error:'Invalid signature'},{status:401})
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 const type=String(body?.type||'')
 if(type!=='subscription_preapproval')return NextResponse.json({ok:true})
 if(String(body?.data?.id||'').toLowerCase()!==dataId.toLowerCase())return NextResponse.json({error:'Mismatched resource'},{status:400})
 const response=await fetch('https://api.mercadopago.com/preapproval/'+encodeURIComponent(dataId),{headers:{Authorization:'Bearer '+access},cache:'no-store'})
 if(!response.ok)return NextResponse.json({error:'Provider unavailable'},{status:502})
 const item=await response.json()
 const match=/^zap:([0-9a-f-]{36}):(pro|premium)$/.exec(String(item.external_reference||''))
 if(!match)return NextResponse.json({ok:true})
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:{user},error:userError}=await admin.auth.admin.getUserById(match[1])
 if(userError||!user?.email||user.email.toLowerCase()!==String(item.payer_email||'').toLowerCase())return NextResponse.json({error:'Payer mismatch'},{status:403})
 const {data:record,error}=await admin.from('subscriptions').select('user_id,plan,subscription_status,mp_preapproval_id').eq('user_id',match[1]).maybeSingle()
 if(error||!record)return NextResponse.json({error:'Subscription missing'},{status:500})
 // Ignore notifications for abandoned or superseded checkouts; never activate another subscription.
 if(record.mp_preapproval_id!==String(item.id||''))return NextResponse.json({ok:true,ignored:'subscription_not_current'})
 const status=String(item.status||'')
 if(status==='authorized'){
  const {error:write}=await admin.from('subscriptions').update({plan:match[2],subscription_status:'active',updated_at:new Date().toISOString()}).eq('user_id',match[1])
  if(write)return NextResponse.json({error:'Unable to activate'},{status:500})
 }else if(['cancelled','canceled'].includes(status)&&record.plan===match[2]&&record.subscription_status==='active'){
  const {error:write}=await admin.from('subscriptions').update({subscription_status:'canceled',updated_at:new Date().toISOString()}).eq('user_id',match[1])
  if(write)return NextResponse.json({error:'Unable to cancel'},{status:500})
 }
 return NextResponse.json({ok:true})
}
