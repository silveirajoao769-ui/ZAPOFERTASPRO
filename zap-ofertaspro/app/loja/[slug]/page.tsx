import {createClient} from '@supabase/supabase-js'
import Link from 'next/link'
import type {Metadata} from 'next'
type Offer={id:string;name:string;url:string;price:number;oldPrice?:number;category:string;image?:string}
type Storefront={title:string;slug:string;products:Offer[]}
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n)
async function getStore(slug:string):Promise<Storefront|null>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!url||!key||!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug))return null
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await client.from('storefronts').select('title,slug,products').eq('slug',slug).eq('published',true).maybeSingle()
 if(error||!data||!Array.isArray(data.products))return null
 return data as Storefront
}
export async function generateMetadata({params}:{params:{slug:string}}):Promise<Metadata>{
 const store=await getStore(params.slug)
 return {title:store?store.title+' | ZAP OfertasPro':'Vitrine não encontrada | ZAP OfertasPro',description:'Confira ofertas selecionadas. Preços e disponibilidade podem mudar.'}
}
export const dynamic='force-dynamic'
export default async function StorePage({params}:{params:{slug:string}}){
 const store=await getStore(params.slug)
 if(!store)return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8"><h1 className="text-2xl font-bold">Vitrine não encontrada</h1><p>Este link não existe ou a vitrine ainda não foi publicada.</p><Link href="/" className="text-green-700 underline">Ir ao ZAP OfertasPro</Link></main>
 return <main className="min-h-screen bg-slate-50"><header className="bg-[#10251b] px-5 py-8 text-white"><div className="mx-auto max-w-5xl"><p className="text-sm text-green-300">ZAP OfertasPro · Vitrine de afiliados</p><h1 className="mt-2 text-3xl font-black">{store.title}</h1><p className="mt-2 text-sm text-green-100/80">Ofertas selecionadas para você. Preços e disponibilidade podem mudar.</p></div></header><div className="mx-auto max-w-5xl p-5 py-10"><p className="mb-6 text-sm text-slate-500">{store.products.length} oferta(s) · Alguns links podem gerar comissão para o divulgador.</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{store.products.filter(p=>p&&typeof p.name==='string'&&typeof p.url==='string'&&/^https?:\/\//i.test(p.url)&&Number.isFinite(p.price)).map(p=><article key={p.id} className="overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">{p.image&&/^https?:\/\//i.test(p.image)&&<img src={p.image} alt={p.name} loading="lazy" className="h-48 w-full rounded-xl object-contain"/>}<span className="mt-4 block text-xs font-medium text-green-700">{p.category}</span><h2 className="mt-1 text-lg font-bold">{p.name}</h2>{p.oldPrice&&p.oldPrice>p.price?<p className="mt-2 text-sm text-slate-400 line-through">{money(p.oldPrice)}</p>:null}<p className="mt-1 text-2xl font-black text-green-700">{money(p.price)}</p><a href={`/ir/${store.slug}/${encodeURIComponent(p.id)}`} target="_blank" rel="noopener noreferrer sponsored" className="mt-5 block rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-white hover:bg-green-700">Ver oferta ↗</a></article>)}</div>{store.products.length===0&&<p className="rounded-xl bg-white p-8 text-center text-slate-500">Nenhuma oferta publicada ainda.</p>}</div><footer className="p-8 text-center text-xs text-slate-500">Vitrine criada com ZAP OfertasPro · Consulte o preço final na loja antes de comprar.</footer></main>
}