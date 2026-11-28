// One shared counter covers overlapping local writes and queued remote saves.
let active = 0;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};
export const subscribeSaves = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const savesInFlight = () => active > 0;
export const noServerSaves = () => false;
export async function trackSave<T>(write: () => Promise<T>): Promise<T> {
  active++;
  notify();
  try {
    return await write();
  } finally {
    active--;
    notify();
  }
}
