import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe,expect,it } from 'vitest'
import { adaptSqlForWorker } from '../scripts/sql-worker-adapter.mjs'
const require=createRequire(import.meta.url)
describe('embedded SQL engine host detection',()=>{
  it('disables browser, browser-worker and Node loaders in the installed SQL.js build',()=>{
    const source=readFileSync(require.resolve('sql.js/dist/sql-asm.js'),'utf8')
    const adapted=adaptSqlForWorker(source)
    expect(adapted).toContain('var aa=false,ba=false,ca=false;')
    expect(adapted).not.toContain('ba=!!globalThis.WorkerGlobalScope')
  })
  it('fails the build if the upstream initializer changes instead of silently shipping an unsafe loader',()=>{
    expect(()=>adaptSqlForWorker('different dependency build')).toThrow('initializer changed')
  })
})
