import http from 'node:http'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { localCloud } from './local-cloud.mjs'
import worker from '../dist/server/index.js'
// Prefer preview settings, with the desktop project's key as a local fallback.
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url))})
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url))})
const cloud=await localCloud('.local-data')
cloud.env.TMDB_API_KEY=process.env.TMDB_API_KEY
const server=http.createServer(async(req,res)=>{
  try {
    const host=req.headers.host??'127.0.0.1:5175'
    if(!/^(localhost|127\.0\.0\.1):5175$/.test(host)){res.writeHead(403);res.end();return}
    const url=new URL(req.url??'/',`http://${host}`)
    if(['/signin-with-chatgpt','/signout-with-chatgpt'].includes(url.pathname)){
      res.writeHead(302,{'Set-Cookie':`__watch_preview=${url.pathname.startsWith('/signin')?'1':'0'}; HttpOnly; SameSite=Lax; Path=/`,'Location':'/'});res.end();return
    }
    const headers=new Headers()
    for(const [key,value] of Object.entries(req.headers))if(!key.startsWith('oai-authenticated-user-')&&value)headers.set(key,Array.isArray(value)?value.join(','):value)
    if((req.headers.cookie??'').split(';').some(c=>c.trim()==='__watch_preview=1')){headers.set('oai-authenticated-user-id','local-preview');headers.set('oai-authenticated-user-email','preview@localhost');headers.set('oai-authenticated-user-full-name','Local preview')}
    const chunks=[];for await(const chunk of req)chunks.push(chunk)
    const body=Buffer.concat(chunks)
    const response=await worker.fetch(new Request(url,{method:req.method,headers,...(body.length?{body}:{} )}),cloud.env)
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))
  } catch(error){res.writeHead(500);res.end(String(error))}
})
server.listen(5175,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5175/'))
