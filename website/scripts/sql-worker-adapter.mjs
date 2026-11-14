// This SQL.js build has its entire engine embedded: it needs no browser URL,
// importScripts, Node filesystem loader, or WebAssembly download. Cloudflare
// exposes WorkerGlobalScope but not self.location, unlike a browser worker.
// Disable only this dependency's host loaders rather than inventing globals.
export function adaptSqlForWorker(contents) {
  const initializer='var aa=!!globalThis.window,ba=!!globalThis.WorkerGlobalScope,ca=globalThis.process?.versions?.node&&"renderer"!=globalThis.process?.type;'
  if(contents.split(initializer).length!==2) {
    throw new Error('The SQL.js environment initializer changed; review the Worker adapter before publishing.')
  }
  return contents.replace(initializer,'var aa=false,ba=false,ca=false;')
}
