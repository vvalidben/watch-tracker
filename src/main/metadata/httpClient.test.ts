import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchJson } from './httpClient'
import { ProviderError } from './errors'

function fakeResponse(options: {
  ok: boolean
  status: number
  body?: unknown
  headers?: Record<string, string>
}): Response {
  const headers = new Headers(options.headers ?? {})
  return {
    ok: options.ok,
    status: options.status,
    headers,
    json: async () => options.body
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ ok: true, status: 200, body: { hello: 'world' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchJson<{ hello: string }>('https://example.test/api')

    expect(result).toEqual({ hello: 'world' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws a missing_config ProviderError on 401 without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ ok: false, status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchJson('https://example.test/api')).rejects.toMatchObject({
      code: 'missing_config'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws a missing_config ProviderError on 403', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ ok: false, status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchJson('https://example.test/api')).rejects.toBeInstanceOf(ProviderError)
    await expect(fetchJson('https://example.test/api')).rejects.toMatchObject({ code: 'missing_config' })
  })

  it('retries on 429, respecting Retry-After, then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(fakeResponse({ ok: true, status: 200, body: { data: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchJson<{ data: number }>('https://example.test/api', { baseRetryDelayMs: 1 })

    expect(result).toEqual({ data: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up after maxRetries and throws rate_limited', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ ok: false, status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson('https://example.test/api', { maxRetries: 1, baseRetryDelayMs: 1 })
    ).rejects.toMatchObject({ code: 'rate_limited' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries on 5xx and reports network on exhaustion', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ ok: false, status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson('https://example.test/api', { maxRetries: 1, baseRetryDelayMs: 1 })
    ).rejects.toMatchObject({ code: 'network' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('wraps a network-level throw (e.g. DNS failure) as a network ProviderError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson('https://example.test/api', { maxRetries: 0, baseRetryDelayMs: 1 })
    ).rejects.toMatchObject({ code: 'network', message: expect.stringContaining('ENOTFOUND') })
  })

  it('maps an aborted (timed out) request to a network ProviderError', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    const fetchMock = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson('https://example.test/api', { maxRetries: 0, baseRetryDelayMs: 1 })
    ).rejects.toMatchObject({ code: 'network', message: 'Request timed out' })
  })

  it('replaces the unhelpful bare "fetch failed" message with a clearer offline-sounding one', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('fetch failed'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson('https://example.test/api', { maxRetries: 0, baseRetryDelayMs: 1 })
    ).rejects.toMatchObject({ code: 'network', message: expect.stringContaining('internet connection') })
  })

  it('throws unknown for an unexpected 4xx status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ ok: false, status: 418 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchJson('https://example.test/api')).rejects.toMatchObject({ code: 'unknown' })
  })

  it('throws not_found for a 404, without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ ok: false, status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson('https://example.test/api', { maxRetries: 2, baseRetryDelayMs: 1 })
    ).rejects.toMatchObject({ code: 'not_found', status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
