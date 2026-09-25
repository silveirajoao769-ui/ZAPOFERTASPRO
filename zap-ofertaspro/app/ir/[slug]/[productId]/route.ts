import {createClient} from '@supabase/supabase-js'
import {NextResponse} from 'next/server'
export const dynamic='force-dynamic'
export async function GET(_request:Request,{params}:{params:{slug:string;productId:string}}){
 const {slug,productId}=params
 if(!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)||!productId||productId.length>100)return new Response('Oferta inválida',{status:404})
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!url||!key)return new Response('Serviço indisponível',{status:503})
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await db.rpc('record_offer_click',{p_slug:slug,p_product_id:productId})
 if(error)return new Response('Não foi possível abrir esta oferta',{status:503})
 if(typeof data!=='string')return new Response('Oferta não encontrada',{status:404})
 let target:URL
 try{target=new URL(data);if(!['https:','http:'].includes(target.protocol))throw Error('invalid')}catch{return new Response('Link inválido',{status:400})}
 const response=NextResponse.redirect(target,302);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response
}
