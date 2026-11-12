// Zone a confronto (distretti o comuni), al più quattro. Ogni zona tiene il colore che ha ricevuto quando è stata
// aggiunta: togliendone una, le altre non cambiano colore (il colore segue la zona, non la sua posizione).

type Slot = 1 | 2 | 3 | 4
export interface ZonaScelta {
  id: string
  slot: Slot
}

export const MAX_ZONE = 4

export function alterna(zone: ZonaScelta[], id: string): { zone: ZonaScelta[]; piena: boolean } {
  if (zone.some((z) => z.id === id)) return { zone: zone.filter((z) => z.id !== id), piena: false }
  const liberi = ([1, 2, 3, 4] as Slot[]).filter((s) => !zone.some((z) => z.slot === s))
  if (!liberi.length) return { zone, piena: true }
  return { zone: [...zone, { id, slot: liberi[0] }], piena: false }
}

export const coloreZona = (slot: Slot) => `var(--zona-${slot})`
