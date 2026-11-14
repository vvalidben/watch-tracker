import fs from 'node:fs'
import path from 'node:path'
import { build as viteBuild } from 'vite'
import { build as bundle } from 'esbuild'
import { adaptSqlForWorker } from './sql-worker-adapter.mjs'
import './prepare.mjs'
await viteBuild()
const assets={}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'}
function collect(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const file=path.join(directory,entry.name)
  if(entry.isDirectory())collect(file)
  else if(!file.endsWith('.woff')) assets['/'+path.relative('dist/client',file).replaceAll('\\','/')]={type:types[path.extname(file)]??'application/octet-stream',body:fs.readFileSync(file).toString('base64')}
}}
collect('dist/client')
fs.writeFileSync('src/server/generated/assets.ts',`export const assets: Record<string,{type:string;body:string}> = ${JSON.stringify(assets)}\n`)
await bundle({entryPoints:['src/server/worker.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',minify:true,external:['node:*','fs','path','crypto'],alias:{'@shared':path.resolve('src/shared')},plugins:[{name:'sql-asm-worker',setup(build){build.onLoad({filter:/sql-asm\.js$/},async args=>{
  const contents=adaptSqlForWorker(fs.readFileSync(args.path,'utf8'))
  return {contents,loader:'js',resolveDir:path.dirname(args.path)}
})}}]})
fs.mkdirSync('dist/.openai',{recursive:true})
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json')
fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true})
fs.writeFileSync('dist/server/wrangler.json',JSON.stringify({main:'index.js',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat']}))
console.log(`Built the website and cloud Worker with ${Object.keys(assets).length} self-hosted assets.`)
