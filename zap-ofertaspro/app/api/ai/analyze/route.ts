import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
  if(!token)return NextResponse.json({error:'Entre na sua conta.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.OPENAI_API_KEY
  if(!url||!anon||!key)return NextResponse.json({error:'Análise de IA não configurada.'},{status:503})
  const supabase=createClient(url,anon,{auth:{persistSession:false}})
  const {data:{user},error}=await supabase.auth.getUser(token)
  if(error||!user)return NextResponse.json({error:'Sessão inválida.'},{status:401})
  const {data:sub}=await supabase.from('subscriptions').select('plan,subscription_status,trial_ends_at').eq('user_id',user.id).maybeSingle()
  if(!(sub?.subscription_status==='active'||(sub?.plan==='trial'&&!!sub.trial_ends_at&&new Date(sub.trial_ends_at).getTime()>Date.now())))return NextResponse.json({error:'É necessário um plano ativo ou teste válido.'},{status:403})
  const body=await req.json(),niche=String(body.niche||'').trim().slice(0,100),budget=String(body.budget||'').trim().slice(0,60),candidate=String(body.candidate||'').trim().slice(0,500)
  if(!niche&&!candidate)return NextResponse.json({error:'Informe um nicho ou produto para analisar.'},{status:400})
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',temperature:0.5,max_tokens:1100,messages:[{role:'system',content:'Você é um analista de produtos para afiliados brasileiros. Responda em português do Brasil. NÃO tem acesso a preços, vendas, avaliações, tendências ou comissões atuais da Shopee. Nunca invente dados, links ou métricas. Sugira 5 tipos de produtos plausíveis no nicho informado e explique público-alvo, argumentos de venda, riscos e quais dados o afiliado deve verificar no marketplace antes de divulgar. Se houver produto específico, analise-o separadamente. Use seções claras e concisas. Não afirme que um produto é campeão de vendas ou está em alta sem evidência. Informe que isto é uma análise exploratória, não mineração de catálogo em tempo real.'},{role:'user',content:JSON.stringify({nicho:niche,faixaDePreco:budget,produtoParaAnalisar:candidate})}]}) ,signal:AbortSignal.timeout(25000)})
  if(!response.ok){console.error('Product analyst API error',{status:response.status});return NextResponse.json({error:'A IA está indisponível no momento.'},{status:502})}
  const data=await response.json(),analysis=data?.choices?.[0]?.message?.content
  if(typeof analysis!=='string'||!analysis)return NextResponse.json({error:'A IA não retornou uma análise.'},{status:502})
  return NextResponse.json({analysis,source:'Análise exploratória por IA; sem consulta ao catálogo em tempo real.'})
 }catch(e){console.error('Product analyst failed',e instanceof Error?e.name:'unknown');return NextResponse.json({error:'Falha ao analisar produtos.'},{status:500})}
}