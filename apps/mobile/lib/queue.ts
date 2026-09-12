import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CreateTripRequest, Trip } from "@carbonroute/shared";
import { createTrip } from "./api";

const KEY = "carbonroute.offline.trips";

export type QueuedSave = {
  id: string;
  payload: CreateTripRequest;
  queuedAt: string;
  lastError?: string;
};

async function readQueue(): Promise<QueuedSave[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedSave[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedSave[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function enqueueTrip(payload: CreateTripRequest): Promise<QueuedSave> {
  const item: QueuedSave = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queuedAt: new Date().toISOString(),
  };
  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function listQueued(): Promise<QueuedSave[]> {
  return readQueue();
}

export async function flushQueue(): Promise<{ saved: Trip[]; remaining: QueuedSave[] }> {
  const queue = await readQueue();
  const remaining: QueuedSave[] = [];
  const saved: Trip[] = [];
  for (const item of queue) {
    try {
      saved.push(await createTrip(item.payload));
    } catch (err) {
      remaining.push({
        ...item,
        lastError: err instanceof Error ? err.message : "Save failed",
      });
    }
  }
  await writeQueue(remaining);
  return { saved, remaining };
}
