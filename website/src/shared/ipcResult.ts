/** Generic success/failure envelope for mutating IPC calls. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
