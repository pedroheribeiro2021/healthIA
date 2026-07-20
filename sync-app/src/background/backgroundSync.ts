import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { getDeviceId } from "../lib/deviceId";
import { syncNow } from "../lib/sync";

const BACKGROUND_SYNC_TASK = "healthia-background-sync";

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const deviceId = await getDeviceId();
    const result = await syncNow(deviceId);
    return result.sent > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("[healthia] sync em background falhou", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Sync periódico best-effort (limites do Android decidem a cadência real
// — ver docs/ARCHITECTURE.md, "sem push em tempo real"). Complementa o
// botão de sync manual, não o substitui.
export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (status !== BackgroundFetch.BackgroundFetchStatus.Available) return;

  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_SYNC_TASK,
  );
  if (alreadyRegistered) return;

  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 60 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
