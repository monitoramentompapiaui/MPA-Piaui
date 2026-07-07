const DB_NAME = 'fishery_app_db_v4';
const STORE_NAME = 'key_values';
const FORMS_STORE_NAME = 'landing_forms';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(FORMS_STORE_NAME)) {
        db.createObjectStore(FORMS_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB get error, trying fallback:', e);
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }
}

export async function dbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB set error, trying fallback:', e);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Fallback localStorage set also failed:', err);
    }
  }
}

export async function dbRemove(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB remove error:', e);
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

// --- OPTIMIZED FORMS STORE FOR MASSIVE DATASET (250K+ RECORDS) ---

export async function dbSaveForm(form: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FORMS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(FORMS_STORE_NAME);
      const request = store.put(form);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('dbSaveForm error:', e);
  }
}

export async function dbSaveFormsBulk(forms: any[]): Promise<void> {
  if (!forms || forms.length === 0) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FORMS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(FORMS_STORE_NAME);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      for (const form of forms) {
        store.put(form);
      }
    });
  } catch (e) {
    console.error('dbSaveFormsBulk error:', e);
  }
}

export async function dbGetAllForms(): Promise<any[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FORMS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(FORMS_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('dbGetAllForms error:', e);
    return [];
  }
}

export async function dbDeleteForm(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FORMS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(FORMS_STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('dbDeleteForm error:', e);
  }
}

export async function dbDeleteFormsBulk(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FORMS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(FORMS_STORE_NAME);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      for (const id of ids) {
        store.delete(id);
      }
    });
  } catch (e) {
    console.error('dbDeleteFormsBulk error:', e);
  }
}

export async function dbClearAllForms(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FORMS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(FORMS_STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('dbClearAllForms error:', e);
  }
}

export function getErrorMessage(err: any): string {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;
  
  if (err instanceof Error) {
    return err.message || 'Erro interno';
  }
  
  if (typeof err === 'object') {
    const msg = err.message !== undefined && err.message !== null ? String(err.message).trim() : '';
    if (msg) return msg;
    
    // Se o erro tem campo "message" mas ele é vazio, ou se for similar a {"message": ""}
    // Geralmente isso acontece quando o projeto no Supabase foi Pausado (inativo por inatividade)
    // ou se as credenciais estão incorretas causando rejeição na rota.
    if ('message' in err && msg === '') {
      return 'Projeto do Supabase inativo/pausado ou sem resposta. Por favor, acesse o painel do Supabase (https://supabase.com/dashboard) e clique em "Restore Project" para reativar o seu banco de dados.';
    }
    
    if (err.error && typeof err.error === 'object') {
      const subMsg = err.error.message !== undefined && err.error.message !== null ? String(err.error.message).trim() : '';
      if (subMsg) return subMsg;
      if ('message' in err.error && subMsg === '') {
        return 'Projeto do Supabase inativo/pausado ou sem resposta. Por favor, acesse o painel do Supabase (https://supabase.com/dashboard) e clique em "Restore Project" para reativar o seu banco de dados.';
      }
      return JSON.stringify(err.error);
    }
    
    if (err.details && typeof err.details === 'string') {
      return err.details;
    }
    
    if (err.code && typeof err.code === 'string') {
      return `Código de erro postgrest/database: ${err.code}`;
    }
  }

  try {
    const stringified = JSON.stringify(err);
    if (stringified && stringified !== '{}') {
      if (stringified === '{"message":""}') {
        return 'Projeto do Supabase inativo/pausado ou sem resposta. Por favor, acesse o painel do Supabase (https://supabase.com/dashboard) e clique em "Restore Project" para reativar o seu banco de dados.';
      }
      return stringified;
    }
  } catch (e) {
    // Ignore stringify errors
  }

  return String(err);
}

