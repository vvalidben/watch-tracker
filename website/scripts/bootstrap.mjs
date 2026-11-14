import fs from 'node:fs'
import path from 'node:path'
const project = process.cwd()
const desktop = path.dirname(project)
for (const directory of ['db','library','metadata']) fs.cpSync(path.join(desktop,'src/main',directory),path.join(project,'src/server',directory),{recursive:true})
fs.mkdirSync('src/server/ipc',{recursive:true})
for (const file of ['library','metadata','dashboard','statistics','watchLog','tags']) fs.copyFileSync(path.join(desktop,'src/main/ipc',`${file}.ts`),`src/server/ipc/${file}.ts`)
fs.mkdirSync('src/server/backup',{recursive:true})
fs.copyFileSync(path.join(desktop,'src/main/backup/exportBackup.ts'),'src/server/backup/exportBackup.ts')
fs.mkdirSync('src/server/migrations',{recursive:true})
fs.cpSync(path.join(desktop,'drizzle/migrations'),'src/server/migrations',{recursive:true})
const original = JSON.parse(fs.readFileSync(path.join(desktop,'package.json'),'utf8'))
original.name = 'watch-tracker-web'
delete original.main
original.type = 'module'
original.scripts = {dev:'node scripts/dev.mjs',build:'node scripts/build.mjs',typecheck:'tsc --noEmit',test:'vitest run', 'db:generate':'drizzle-kit generate'}
fs.writeFileSync('package.json',JSON.stringify(original,null,2)+'\n')
const lock = JSON.parse(fs.readFileSync(path.join(desktop,'package-lock.json'),'utf8'))
lock.name = original.name
lock.packages[''].name = original.name
fs.writeFileSync('package-lock.json',JSON.stringify(lock,null,2)+'\n')
let api = fs.readFileSync(path.join(desktop,'src/preload/index.ts'),'utf8')
api = api.replace("import { contextBridge, ipcRenderer } from 'electron'", "import { rpc } from './transport'\nconst ipcRenderer = { invoke: rpc }")
api = api.replace("contextBridge.exposeInMainWorld('api', api)", 'window.api = api')
fs.writeFileSync('src/api.ts',api)
fs.writeFileSync('src/renderer/cloud.d.ts',"import type { Api } from '../api'\ndeclare global { interface Window { api: Api } }\n")
let tailwind = fs.readFileSync('tailwind.config.ts','utf8').replace("'./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'", "'./index.html', './src/renderer/**/*.{ts,tsx}'")
fs.writeFileSync('tailwind.config.ts',tailwind)
let main = fs.readFileSync('src/renderer/main.tsx','utf8')
fs.writeFileSync('src/renderer/main.tsx',"import '../api'\n"+main+"\nimport './assets/web.css'\n")
const hosting = JSON.parse(fs.readFileSync('.openai/hosting.json','utf8'))
hosting.d1 = 'DB'; hosting.r2 = 'BUCKET'
fs.writeFileSync('.openai/hosting.json',JSON.stringify(hosting,null,2)+'\n')
