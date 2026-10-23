import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Connection, PendingTurn } from "./api";
import { restoreLocal, type LocalState } from "./model";

const STATE = "sol.mobile.demo.v1",
  CONNECTION = "sol.mobile.connection.v1",
  PENDING = "sol.mobile.pending.v1";
let writes = Promise.resolve();
// Credentials stay in OS storage on phones. Web preview uses memory only.
let webConnection: Connection | null = null;
export const loadLocal = async () =>
  restoreLocal(await AsyncStorage.getItem(STATE));
export function saveLocal(state: LocalState) {
  const next = writes
    .catch(() => {})
    .then(() => AsyncStorage.setItem(STATE, JSON.stringify(state)));
  writes = next;
  return next;
}
export async function loadConnection(): Promise<Connection | null> {
  const raw =
    Platform.OS === "web" ? null : await SecureStore.getItemAsync(CONNECTION);
  return Platform.OS === "web" ? webConnection : raw ? JSON.parse(raw) : null;
}
export async function saveConnection(value: Connection | null) {
  if (Platform.OS === "web") {
    webConnection = value;
    return;
  }
  if (value) await SecureStore.setItemAsync(CONNECTION, JSON.stringify(value));
  else await SecureStore.deleteItemAsync(CONNECTION);
}
export async function loadPending(): Promise<PendingTurn | null> {
  const raw = await AsyncStorage.getItem(PENDING);
  return raw ? JSON.parse(raw) : null;
}
export const savePending = (value: PendingTurn | null) =>
  value
    ? AsyncStorage.setItem(PENDING, JSON.stringify(value))
    : AsyncStorage.removeItem(PENDING);
