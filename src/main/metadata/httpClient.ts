import { ProviderError } from './errors'

export interface FetchJsonOptions extends RequestInit {
  /** Retries on 429/5xx before giving up. Defaults to 2 (3 attempts total). */
  maxRetries?: number
  /** Aborts the request if it takes longer than this. Defaults to 10s. */
  timeoutMs?: number
  /** Base delay for exponential backoff (doubled per attempt) when a retry has no Retry-After header. Defaults to 500ms. */
  baseRetryDelayMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined
  const seconds = Number(header)
  if (!Number.isNaN(seconds)) return seconds * 1000
  const dateMs = Date.parse(header)
  return Number.isNaN(dateMs) ? undefined : Math.max(0, dateMs - Date.now())
}

/**
 * fetch() with a timeout and automatic retry/backoff on 429 and 5xx
 * responses. Throws a ProviderError with a stable `code` on any failure that
 * survives retries, so callers never have to deal with raw fetch errors.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { maxRetries = 2, timeoutMs = 10_000, baseRetryDelayMs = 500, ...init } = options

  let lastError: ProviderError | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...init, signal: controller.signal })

      if (response.ok) {
        return (await response.json()) as T
      }

      if (response.status === 401 || response.status === 403) {
        throw new ProviderError(
          'missing_config',
          `Request rejected (${response.status}) — check that the API key is valid.`,
          response.status
        )
      }

      if (response.status === 404) {
        // Not retried — a missing resource won't appear on a retry. The
        // message is deliberately generic here; callers that know exactly
        // *what* was being requested (a specific movie, season, episode...)
        // catch this and rethrow with that context — see tmdbClient.ts.
        throw new ProviderError('not_found', 'The requested resource was not found', 404)
      }

      if (response.status === 429 || response.status >= 500) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
        lastError = new ProviderError(
          response.status === 429 ? 'rate_limited' : 'network',
          `Request failed with status ${response.status}`,
          response.status
        )
        if (attempt < maxRetries) {
          const backoffMs = retryAfterMs ?? baseRetryDelayMs * 2 ** attempt
          await sleep(backoffMs)
          continue
        }
        throw lastError
      }

      throw new ProviderError('unknown', `Request failed with status ${response.status}`, response.status)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      const isAbort = error instanceof Error && error.name === 'AbortError'
      const rawMessage = error instanceof Error ? error.message : String(error)
      // Node's fetch throws the bare string "fetch failed" for a refused/
      // reset connection — accurate but meaningless to a user. Any more
      // specific underlying message (a DNS failure, etc.) is left as-is.
      const message = isAbort
        ? 'Request timed out'
        : rawMessage === 'fetch failed'
          ? 'Could not reach the network — check your internet connection'
          : rawMessage
      lastError = new ProviderError('network', message)
      if (attempt < maxRetries) {
        await sleep(baseRetryDelayMs * 2 ** attempt)
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timeout)
    }
  }

  // Unreachable, but keeps TypeScript happy about the return type.
  throw lastError ?? new ProviderError('unknown', 'Request failed')
}
