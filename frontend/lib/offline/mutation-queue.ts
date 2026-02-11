const DB_NAME = "bonaso-offline-db"
const DB_VERSION = 2
const STORE_NAME = "mutation_queue"
const HISTORY_STORE_NAME = "sync_history"
export const OFFLINE_SYNC_TAG = "bonaso-sync-mutations"

const DEFAULT_HISTORY_LIMIT = 50

type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE"
type SyncHistoryStatus = "queued" | "synced" | "dropped" | "failed"

interface QueuedMutation {
  id?: number
  url: string
  method: MutationMethod
  headers: Record<string, string>
  body?: string
  createdAt: number
}

export interface SyncHistoryEntry {
  id?: number
  queueId?: number
  url: string
  method: MutationMethod
  status: SyncHistoryStatus
  httpStatus?: number
  message?: string
  createdAt: number
}

type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>
  }
}

let syncInFlight: Promise<{ processed: number; pending: number }> | null = null

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function emitSyncState(detail: { pending: number; processed?: number; historyUpdated?: boolean }) {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent("bonaso:sync-state", { detail }))
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available"))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
        store.createIndex("createdAt", "createdAt", { unique: false })
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        const historyStore = db.createObjectStore(HISTORY_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        })
        historyStore.createIndex("createdAt", "createdAt", { unique: false })
        historyStore.createIndex("queueId", "queueId", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error("Failed to open offline queue database"))
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)

    tx.oncomplete = () => db.close()
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"))
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"))

    run(store, resolve, reject)
  })
}

function isRetriableStatus(status: number): boolean {
  return status >= 500 || [401, 403, 408, 425, 429].includes(status)
}

async function appendSyncHistory(entry: Omit<SyncHistoryEntry, "id" | "createdAt">): Promise<void> {
  await withStore<void>(HISTORY_STORE_NAME, "readwrite", (store, resolve, reject) => {
    const request = store.add({
      ...entry,
      createdAt: Date.now(),
    } as SyncHistoryEntry)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error || new Error("Failed to append sync history"))
  })
}

export async function listSyncHistory(limit: number = DEFAULT_HISTORY_LIMIT): Promise<SyncHistoryEntry[]> {
  try {
    const history = await withStore<SyncHistoryEntry[]>(HISTORY_STORE_NAME, "readonly", (store, resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve((request.result || []) as SyncHistoryEntry[])
      request.onerror = () => reject(request.error || new Error("Failed to read sync history"))
    })
    history.sort((a, b) => b.createdAt - a.createdAt)
    return history.slice(0, Math.max(1, limit))
  } catch {
    return []
  }
}

export async function clearSyncHistory(): Promise<void> {
  await withStore<void>(HISTORY_STORE_NAME, "readwrite", (store, resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error || new Error("Failed to clear sync history"))
  })

  const pending = await getQueuedMutationCount()
  emitSyncState({ pending, historyUpdated: true })
}

export async function enqueueMutation(mutation: Omit<QueuedMutation, "id" | "createdAt">): Promise<number> {
  const id = await withStore<number>(STORE_NAME, "readwrite", (store, resolve, reject) => {
    const request = store.add({
      ...mutation,
      createdAt: Date.now(),
    } as QueuedMutation)
    request.onsuccess = () => resolve(Number(request.result))
    request.onerror = () => reject(request.error || new Error("Failed to enqueue mutation"))
  })

  await appendSyncHistory({
    queueId: id,
    url: mutation.url,
    method: mutation.method,
    status: "queued",
    message: "Queued while offline",
  })

  const pending = await getQueuedMutationCount()
  emitSyncState({ pending, historyUpdated: true })
  return id
}

export async function getQueuedMutationCount(): Promise<number> {
  try {
    return await withStore<number>(STORE_NAME, "readonly", (store, resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error("Failed to count queued mutations"))
    })
  } catch {
    return 0
  }
}

async function getQueuedMutations(): Promise<QueuedMutation[]> {
  return withStore<QueuedMutation[]>(STORE_NAME, "readonly", (store, resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const items = (request.result || []) as QueuedMutation[]
      items.sort((a, b) => a.createdAt - b.createdAt)
      resolve(items)
    }
    request.onerror = () => reject(request.error || new Error("Failed to read queued mutations"))
  })
}

async function removeQueuedMutation(id: number): Promise<void> {
  await withStore<void>(STORE_NAME, "readwrite", (store, resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error || new Error("Failed to remove queued mutation"))
  })
}

function withCurrentAuthHeader(headers: Record<string, string>): Headers {
  const merged = new Headers(headers)
  if (!merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json")
  }
  if (isBrowser()) {
    const accessToken = localStorage.getItem("access_token")
    if (accessToken) {
      merged.set("Authorization", `Bearer ${accessToken}`)
    }
  }
  return merged
}

async function notifyPendingCount(processed?: number, historyUpdated: boolean = false) {
  const pending = await getQueuedMutationCount()
  emitSyncState({ pending, processed, historyUpdated })
}

export async function processQueuedMutations(): Promise<{ processed: number; pending: number }> {
  if (syncInFlight) return syncInFlight

  syncInFlight = (async () => {
    if (!isBrowser()) return { processed: 0, pending: 0 }
    if (!navigator.onLine) {
      const pending = await getQueuedMutationCount()
      return { processed: 0, pending }
    }

    const queue = await getQueuedMutations()
    let processed = 0
    let historyUpdated = false

    for (const item of queue) {
      if (!item.id) continue
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: withCurrentAuthHeader(item.headers),
          body: item.body,
        })

        if (response.ok) {
          await removeQueuedMutation(item.id)
          await appendSyncHistory({
            queueId: item.id,
            url: item.url,
            method: item.method,
            status: "synced",
            httpStatus: response.status,
            message: "Successfully synced",
          })
          processed += 1
          historyUpdated = true
          continue
        }

        if (!isRetriableStatus(response.status)) {
          await removeQueuedMutation(item.id)
          await appendSyncHistory({
            queueId: item.id,
            url: item.url,
            method: item.method,
            status: "dropped",
            httpStatus: response.status,
            message: "Dropped after non-retriable server response",
          })
          processed += 1
          historyUpdated = true
          continue
        }

        await appendSyncHistory({
          queueId: item.id,
          url: item.url,
          method: item.method,
          status: "failed",
          httpStatus: response.status,
          message: "Retriable server error, will retry",
        })
        historyUpdated = true
        break
      } catch {
        await appendSyncHistory({
          queueId: item.id,
          url: item.url,
          method: item.method,
          status: "failed",
          message: "Network error during replay, will retry",
        })
        historyUpdated = true
        break
      }
    }

    await notifyPendingCount(processed, historyUpdated)
    return { processed, pending: await getQueuedMutationCount() }
  })()

  try {
    return await syncInFlight
  } finally {
    syncInFlight = null
  }
}

export async function scheduleMutationSync(): Promise<void> {
  if (!isBrowser()) return

  let delegatedToServiceWorker = false

  if ("serviceWorker" in navigator) {
    try {
      const registration = (await navigator.serviceWorker.ready) as SyncCapableRegistration
      if (registration.active) {
        registration.active.postMessage({ type: "SYNC_MUTATIONS" })
        delegatedToServiceWorker = true
      }
      await registration.sync?.register(OFFLINE_SYNC_TAG)
    } catch {
      // Ignore and fall back to foreground sync.
    }
  }

  if (!delegatedToServiceWorker && navigator.onLine) {
    await processQueuedMutations()
  } else if (!navigator.onLine) {
    await notifyPendingCount(undefined, false)
  }
}
