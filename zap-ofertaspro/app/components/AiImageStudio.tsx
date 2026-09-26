'use client'
import {useState} from 'react'
import type {User} from '@supabase/supabase-js'
import {supabase} from '../../lib/supabase'
import type {Product} from '../../lib/types'
export default function AiImageStudio({user,product}:{user:User|null;product?:Product}){
 const [size,setSize]=useState<'1024x1024'|'1024x1536'>('1024x1024')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[image,setImage]=useState('')
 const generate=async()=>{
  if(!supabase||!user||!product)return
  setBusy(true);setError('');setImage('')
  try{
   const {data}=await supabase.auth.getSession()
   if(!data.session?.access_token)throw Error('Entre na sua conta.')
   const res=await fetch('/api/ai/image',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({...product,size})})
   const result=await res.json()
   if(!res.ok)throw Error(result.error||'Falha ao gerar imagem.')
   setImage(result.image)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao gerar imagem.')}finally{setBusy(false)}
 }
 return <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
  <h3 className="text-lg font-black text-emerald-950">Criar anúncio em imagem com IA</h3>
  <p className="mt-2 text-sm text-emerald-900">Selecione um produto acima. A arte é ilustrativa; confira preço e disponibilidade.</p>
  <div className="mt-4 flex flex-wrap gap-3">
   <select aria-label="Formato da imagem" className="rounded-xl border p-3" value={size} onChange={e=>setSize(e.target.value as typeof size)}><option value="1024x1024">Quadrado · Feed</option><option value="1024x1536">Vertical · Stories</option></select>
   <button className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50" disabled={!user||!product||busy} onClick={generate}>{busy?'Gerando...':'Gerar imagem com IA'}</button>
  </div>
  {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}
  {image&&<div className="mt-5"><img src={image} alt="Anúncio ilustrativo gerado por IA" className="max-h-[560px] max-w-full rounded-xl"/><a className="mt-3 inline-block rounded-xl bg-emerald-900 px-4 py-3 font-bold text-white" href={image} download="zap-ofertaspro-anuncio.png">Baixar imagem PNG</a></div>}
 </section>
}