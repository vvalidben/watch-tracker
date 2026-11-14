import { AsyncLocalStorage } from 'node:async_hooks'
type Handler = (event: undefined, request: unknown) => unknown
const registry = new AsyncLocalStorage<Map<string,Handler>>()
export const authenticatedIpc = { handle<T>(channel: string, listener: (event: undefined, request: T) => unknown): void {
  const handlers = registry.getStore()
  if (!handlers) throw new Error('Request registry is not available')
  handlers.set(channel,listener as Handler)
} }
export async function registered<T>(setup: () => void, channel: string, request: unknown): Promise<T> {
  return registry.run(new Map(),async () => {
    setup()
    const handler = registry.getStore()!.get(channel)
    if (!handler) throw new Error('Unknown operation')
    return await handler(undefined,request) as T
  })
}
