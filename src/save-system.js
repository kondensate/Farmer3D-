// Versioned save-slot storage. Legacy saves are copied into the first slot,
// never removed, so an interrupted migration cannot destroy the old farm.
export const SAVE_SLOT_INDEX_KEY = "farmerbot4_save_slots_v1";
export const ACTIVE_SAVE_SLOT_KEY = "farmerbot4_active_slot_v1";
export const SAVE_SLOT_PREFIX = "farmerbot4_save_slot_v1_";
export const DEFAULT_SAVE_SLOT_ID = "slot-1";

const MAX_SAVE_SLOTS = 12;

export function normalizeSaveSlotId(value) {
  const id = String(value ?? "");
  return /^[a-z0-9][a-z0-9-]{0,47}$/i.test(id) ? id : null;
}

export function saveSlotStorageKey(id) {
  const safeId = normalizeSaveSlotId(id);
  if (!safeId) throw new TypeError("Некорректный идентификатор слота сохранения");
  return SAVE_SLOT_PREFIX + safeId;
}

export function readSaveSlots(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(SAVE_SLOT_INDEX_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const used = new Set();
    return parsed.filter(item => {
      const id = normalizeSaveSlotId(item?.id);
      if (!id || used.has(id)) return false;
      used.add(id);
      return true;
    }).slice(0, MAX_SAVE_SLOTS).map(item => ({
      id: normalizeSaveSlotId(item.id),
      name: String(item.name || "Ферма").slice(0, 40),
      createdAt: Number(item.createdAt) || 0,
      updatedAt: Number(item.updatedAt) || 0,
      biome: String(item.biome || "meadow"),
      mode: String(item.mode || "campaign"),
      seed: String(item.seed || "")
    }));
  } catch {
    return [];
  }
}

function writeCatalog(storage, slots) {
  storage.setItem(SAVE_SLOT_INDEX_KEY, JSON.stringify(slots.slice(0, MAX_SAVE_SLOTS)));
}

export function ensureSaveSlot(storage, id, name = "Ферма", now = Date.now()) {
  const safeId = normalizeSaveSlotId(id);
  if (!safeId) throw new TypeError("Некорректный идентификатор слота сохранения");
  const slots = readSaveSlots(storage);
  const existing = slots.find(slot => slot.id === safeId);
  if (existing) return existing;
  if (slots.length >= MAX_SAVE_SLOTS) throw new RangeError("Достигнут лимит сохранений (12)");
  const slot = { id: safeId, name: String(name || "Ферма").slice(0, 40), createdAt: now, updatedAt: now, biome: "meadow", mode: "campaign", seed: "" };
  slots.push(slot);
  writeCatalog(storage, slots);
  return slot;
}

export function createSaveSlot(storage, name = "Ферма", now = Date.now()) {
  const slots = readSaveSlots(storage);
  if (slots.length >= MAX_SAVE_SLOTS) throw new RangeError("Достигнут лимит сохранений (12)");
  let id;
  do { id = `farm-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
  while (slots.some(slot => slot.id === id));
  return ensureSaveSlot(storage, id, name, now);
}

export function resolveSaveSlot(storage, { requestedId = null, legacyKeys = [] } = {}) {
  let slots = readSaveSlots(storage);
  const requested = normalizeSaveSlotId(requestedId);
  const stored = normalizeSaveSlotId(storage.getItem(ACTIVE_SAVE_SLOT_KEY));
  let id = requested || stored || DEFAULT_SAVE_SLOT_ID;
  if (!slots.some(slot => slot.id === id)) {
    if (slots.length >= MAX_SAVE_SLOTS) id = slots[0].id;
    else ensureSaveSlot(storage, id, id === DEFAULT_SAVE_SLOT_ID ? "Ферма 1" : "Ферма");
  }
  const key = saveSlotStorageKey(id);
  if (!storage.getItem(key) && id === DEFAULT_SAVE_SLOT_ID) {
    for (const legacyKey of legacyKeys) {
      const legacy = storage.getItem(legacyKey);
      if (!legacy) continue;
      try {
        const parsed = JSON.parse(legacy);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
        storage.setItem(key, legacy);
        break;
      } catch { /* Leave malformed legacy data untouched for recovery. */ }
    }
  }
  storage.setItem(ACTIVE_SAVE_SLOT_KEY, id);
  return id;
}

export function readSaveSlot(storage, id) {
  const raw = storage.getItem(saveSlotStorageKey(id));
  if (!raw) return { status: "empty", data: null, raw: null };
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { status: "corrupt", data: null, raw };
    if (data.version !== undefined && (!Number.isInteger(Number(data.version)) || Number(data.version) < 2 || Number(data.version) > 8)) return { status: "corrupt", data: null, raw };
    return { status: "ok", data, raw };
  } catch {
    return { status: "corrupt", data: null, raw };
  }
}

export function writeSaveSlot(storage, id, data, now = Date.now()) {
  const slot = ensureSaveSlot(storage, id, "Ферма", now);
  const serialized = JSON.stringify(data);
  storage.setItem(saveSlotStorageKey(id), serialized);
  const slots = readSaveSlots(storage);
  const updated = slots.map(item => item.id === id ? {
    ...item,
    updatedAt: now,
    biome: String(data?.world?.activeBiome || item.biome),
    mode: String(data?.gameMode || item.mode),
    seed: String(data?.world?.seed || item.seed)
  } : item);
  writeCatalog(storage, updated);
  return { slot, serialized };
}
