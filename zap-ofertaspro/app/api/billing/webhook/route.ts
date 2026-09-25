import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 const secret=process.env.MERCADOPAGO_ACCESS_TOKEN,url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!secret||!url||!service)return NextResponse.json({error:'Not configured'},{status:503})
 let payload:any;try{payload=await req.json()}catch{return NextResponse.json({error:'Invalid payload'},{status:400})}
 const id=String(payload?.data?.id||'')
 const type=String(payload?.type||payload?.action||'')
 if(!/^\d{1,30}$/.test(id)||!(/subscription_preapproval|preapproval/.test(type)))return NextResponse.json({ok:true})
 const response=await fetch('https://api.mercadopago.com/preapproval/'+id,{headers:{Authorization:'Bearer '+secret},cache:'no-store'})
 if(!response.ok)return NextResponse.json({error:'Provider unavailable'},{status:502})
 const item=await response.json()
 const match=/^zap:([0-9a-f-]{36}):(pro|premium)$/.exec(String(item.external_reference||''))
 if(!match)return NextResponse.json({ok:true})
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:record,error}=await admin.from('subscriptions').select('user_id,plan,subscription_status').eq('user_id',match[1]).maybeSingle()
 if(error||!record)return NextResponse.json({error:'Subscription not found'},{status:500})
 const status=String(item.status||'')
 if(status==='authorized'){
  const {error:updateError}=await admin.from('subscriptions').update({plan:match[2],subscription_status:'active',updated_at:new Date().toISOString()}).eq('user_id',match[1])
  if(updateError)return NextResponse.json({error:'Unable to activate'},{status:500})
 }else if(['cancelled','canceled'].includes(status)&&record.plan===match[2]&&record.subscription_status==='active'){
  const {error:updateError}=await admin.from('subscriptions').update({subscription_status:'canceled',updated_at:new Date().toISOString()}).eq('user_id',match[1])
  if(updateError)return NextResponse.json({error:'Unable to cancel'},{status:500})
 }
 return NextResponse.json({ok:true})
}
