import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({plugins:[{name:'modern-self-hosted-fonts',enforce:'pre',transform(code,id){if(id.includes('@fontsource')&&id.endsWith('.css'))return code.replace(/,\s*url\([^)]*\.woff["']?\)\s*format\([^)]*\)/g,'')}},react()],resolve:{alias:{'@renderer':resolve('src/renderer'),'@shared':resolve('src/shared')}},server:{host:'127.0.0.1',port:5175,proxy:{'/api':'http://127.0.0.1:8789','/signin-with-chatgpt':'http://127.0.0.1:8789','/signout-with-chatgpt':'http://127.0.0.1:8789'}},build:{outDir:'dist/client',assetsInlineLimit:0}})
