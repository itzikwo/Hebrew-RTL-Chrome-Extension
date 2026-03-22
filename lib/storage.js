// lib/storage.js
// Storage abstraction: chrome.storage.sync primary, chrome.storage.local fallback.
// Key schema: "domains.<hostname>" — one key per domain.
// CFG-04: auto-save is implicit — setDomainConfig writes directly with no debounce or queue.

export async function getDomainConfig(hostname) {
  const key = `domains.${hostname}`;
  try {
    const syncData = await chrome.storage.sync.get(key);
    if (syncData[key] !== undefined) return syncData[key];
  } catch (_) { /* sync unavailable — fall through to local */ }
  const localData = await chrome.storage.local.get(key);
  return localData[key] ?? null;
}

export async function setDomainConfig(hostname, config) {
  const key = `domains.${hostname}`;
  try {
    await chrome.storage.sync.set({ [key]: config });
  } catch (e) {
    // QUOTA_BYTES or QUOTA_BYTES_PER_ITEM exceeded — fall back to local storage
    await chrome.storage.local.set({ [key]: config });
  }
}

export async function getAllConfigs() {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(null).catch(() => ({})),
    chrome.storage.local.get(null)
  ]);
  // Merge: sync takes precedence over local (spread order: {...local, ...sync})
  const merged = { ...localData, ...syncData };
  // Filter to only domain keys
  const result = {};
  for (const [k, v] of Object.entries(merged)) {
    if (k.startsWith('domains.')) result[k] = v;
  }
  return result;
}
