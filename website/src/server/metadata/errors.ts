import type { ProviderErrorCode } from '@shared/metadata'

/** A provider-facing error, carrying the code the UI uses to decide how to explain it. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode
  readonly status?: number

  constructor(code: ProviderErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.status = status
  }
}

export function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new ProviderError('unknown', message)
}
