import * as SecureStore from "expo-secure-store";

// expo-secure-store limita cada item a ~2048 bytes; uma sessão do
// Supabase (access + refresh token + dados do usuário) costuma passar
// disso. Esse adapter fragmenta valores grandes em vários itens
// (padrão documentado pelo próprio Supabase para uso com Expo).
const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = "_chunks";

function chunkKey(key: string, index: number): string {
  return `${key}_${index}`;
}

async function getItem(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
  if (!countRaw) {
    return SecureStore.getItemAsync(key);
  }

  const count = Number(countRaw);
  const chunks: string[] = [];
  for (let i = 0; i < count; i++) {
    const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
    if (chunk === null) return null;
    chunks.push(chunk);
  }
  return chunks.join("");
}

async function removeItem(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
  if (countRaw) {
    const count = Number(countRaw);
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(chunkKey(key, i)),
      ),
    );
    await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX);
  }
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(chunks.length));
  await Promise.all(
    chunks.map((chunk, index) =>
      SecureStore.setItemAsync(chunkKey(key, index), chunk),
    ),
  );
}

export const secureStoreAdapter = { getItem, setItem, removeItem };
