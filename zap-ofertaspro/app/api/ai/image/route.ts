import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export const maxDuration=60
const allowed=['1024x1024','1024x1536'] as const
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
  if(!token)return NextResponse.json({error:'Entre na sua conta.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.OPENAI_API_KEY
  if(!url||!anon||!key)return NextResponse.json({error:'Estúdio de IA ainda não configurado.'},{status:503})
  const supabase=createClient(url,anon,{auth:{persistSession:false}})
  const {data:{user},error}=await supabase.auth.getUser(token)
  if(error||!user)return NextResponse.json({error:'Sessão inválida.'},{status:401})
  const {data:sub}=await supabase.from('subscriptions').select('plan,subscription_status,trial_ends_at').eq('user_id',user.id).maybeSingle()
  const eligible=sub?.subscription_status==='active'||(sub?.plan==='trial'&&!!sub.trial_ends_at&&new Date(sub.trial_ends_at).getTime()>Date.now())
  if(!eligible)return NextResponse.json({error:'É necessário um plano ativo ou período de teste válido.'},{status:403})
  const body=await req.json()
  const name=String(body.name||'').trim().slice(0,120),category=String(body.category||'').trim().slice(0,60)
  const price=Number(body.price),oldPrice=Number(body.oldPrice||0)
  const size=allowed.includes(body.size)?body.size:'1024x1024'
  if(!name||!Number.isFinite(price)||price<=0)return NextResponse.json({error:'Produto ou preço inválido.'},{status:400})
  const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n)
  const prompt=['Crie uma arte publicitária premium em português brasileiro para uma oferta de e-commerce.','Design profissional, moderno, limpo, verde-escuro e verde-lima, com hierarquia visual clara e tipografia legível.','Produto: '+name+'. Categoria: '+category+'.','Preço atual EXATAMENTE: '+brl(price)+'.',oldPrice>price?'Preço anterior EXATAMENTE: '+brl(oldPrice)+'.':'Não exiba preço anterior.','Texto de chamada: ACHADINHO DO DIA.','Não invente descontos, avaliações, selos, garantias, marca, logotipo ou características não fornecidas.','Ilustre o tipo de produto sem alegar que é uma foto fiel do item vendido. Não inclua logotipos de marketplaces.','Inclua uma pequena nota: Confira preço e disponibilidade.'].join(' ')
  const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-1',size,quality:'medium',n:1,prompt}),signal:AbortSignal.timeout(55000)})
  if(!response.ok){console.error('AI image generation failed',{status:response.status});return NextResponse.json({error:response.status===429?'Limite temporário da IA. Tente mais tarde.':'Não foi possível gerar a imagem agora.'},{status:502})}
  const result=await response.json()
  const image=result?.data?.[0]?.b64_json
  if(typeof image!=='string'||!image)return NextResponse.json({error:'A IA não retornou uma imagem.'},{status:502})
  return NextResponse.json({image:'data:image/png;base64,'+image})
 }catch(e){console.error('AI studio request failed',e instanceof Error?e.name:'unknown');return NextResponse.json({error:'Erro ao gerar imagem.'},{status:500})}
}