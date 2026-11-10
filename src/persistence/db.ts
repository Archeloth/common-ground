// A small promisified IndexedDB wrapper (the plan's tech table: "Native,
// handles large saves"). There is no server, so this IS the disk. Browser-only:
// openSaveDb() rejects outside the browser; unit tests use a MemorySaveDb fake
// in slots.test.ts.
//
// The plan also says to "always write saves to a new slot entry before
// replacing the old one, and keep the last known good autosave": IndexedDB puts
// are transactional, so a failed write leaves the previous value untouched.

export interface SaveDb {
  read(key: string): Promise<string | null>
  write(key: string, json: string): Promise<void>
  remove(key: string): Promise<void>
  keys(): Promise<string[]>
  close(): void
}

const STORE = 'saves'

export function openSaveDb(dbName = 'common-ground'): Promise<SaveDb> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'))
      return
    }
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE)
    }
    request.onerror = () => reject(request.error ?? new Error('could not open IndexedDB'))
    request.onsuccess = () => {
      const database = request.result
      resolve(createHandle(database))
    }
  })
}

function createHandle(database: IDBDatabase): SaveDb {
  const run = <T>(
    mode: IDBTransactionMode,
    go: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const transaction = database.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    const result = go(store)
    return new Promise((resolve, reject) => {
      result.onsuccess = () => resolve(result.result)
      result.onerror = () => reject(result.error ?? new Error('IndexedDB request failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    })
  }

  return {
    read: (key) =>
      run('readonly', (store) => store.get(key) as IDBRequest<unknown>).then((value) =>
        value === undefined ? null : String(value),
      ),
    write: async (key, json) => {
      await run('readwrite', (store) => store.put(json, key))
    },
    remove: async (key) => {
      await run('readwrite', (store) => store.delete(key))
    },
    keys: async () => {
      const keys = await run('readonly', (store) => store.getAllKeys())
      return keys.map(String)
    },
    close: () => database.close(),
  }
}