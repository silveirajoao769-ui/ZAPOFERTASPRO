'use client'
import {useState} from 'react'
import type {User} from '@supabase/supabase-js'
import {supabase} from '../../lib/supabase'
export default function ProductMiner({user}:{user:User|null}){
 const [niche,setNiche]=useState(''),[budget,setBudget]=useState(''),[candidate,setCandidate]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[analysis,setAnalysis]=useState('')
 const analyze=async()=>{
  if(!supabase||!user)return
  setBusy(true);setError('');setAnalysis('')
  try{
   const {data}=await supabase.auth.getSession()
   if(!data.session?.access_token)throw Error('Faça login para continuar.')
   const res=await fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({niche,budget,candidate})})
   const result=await res.json()
   if(!res.ok)throw Error(result.error||'Falha na análise.')
   setAnalysis(result.analysis)
  }catch(e){setError(e instanceof Error?e.message:'Falha na análise.')}finally{setBusy(false)}
 }
 return <section className="zap-card rounded-2xl bg-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">PESQUISA DE OPORTUNIDADES</p><h2 className="mt-2 text-2xl font-black">Minerador e analista de produtos com IA</h2><p className="mt-2 text-sm text-slate-600">Explore nichos e analise produtos antes de divulgar. Nesta primeira versão, a IA sugere oportunidades; ainda não consulta vendas ou preços da Shopee em tempo real.</p>
 <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Nicho ou categoria<input maxLength={100} className="mt-2 w-full rounded-xl border p-3" placeholder="Ex.: acessórios para pets" value={niche} onChange={e=>setNiche(e.target.value)}/></label><label className="text-sm font-bold">Faixa de preço desejada<input maxLength={60} className="mt-2 w-full rounded-xl border p-3" placeholder="Ex.: R$ 20 a R$ 100" value={budget} onChange={e=>setBudget(e.target.value)}/></label></div>
 <label className="mt-4 block text-sm font-bold">Produto específico (opcional)<textarea maxLength={500} rows={3} className="mt-2 w-full rounded-xl border p-3" placeholder="Nome, características e preço do produto que você encontrou" value={candidate} onChange={e=>setCandidate(e.target.value)}/></label>
 <button disabled={busy||!user||(!niche.trim()&&!candidate.trim())} className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50" onClick={analyze}>{busy?'Analisando...':'Encontrar oportunidades'}</button>
 {!user&&<p className="mt-3 text-sm text-slate-500">Entre na sua conta para usar o minerador.</p>}
 {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
 {analysis&&<div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="mb-3 font-black text-emerald-950">Sua análise</h3><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{analysis}</p><p className="mt-4 text-xs text-slate-500">Confira preços, comissões, estoque e avaliações na Shopee antes de anunciar.</p></div>}
 </section>
}