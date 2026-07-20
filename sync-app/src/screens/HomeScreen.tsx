import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { registerBackgroundSync } from "../background/backgroundSync";
import { getDeviceId } from "../lib/deviceId";
import {
  ensureHealthConnectInitialized,
  hasAllHealthConnectPermissions,
  requestHealthConnectPermissions,
} from "../lib/healthConnect";
import { syncNow } from "../lib/sync";
import { supabase } from "../lib/supabase";

type SyncStatus =
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "done"; accepted: number; duplicates: number; failed: number; at: Date }
  | { kind: "error"; message: string };

export function HomeScreen({ session }: { session: Session }) {
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(
    null,
  );
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" });

  useEffect(() => {
    (async () => {
      await ensureHealthConnectInitialized();
      setPermissionsGranted(await hasAllHealthConnectPermissions());
      await registerBackgroundSync();
    })().catch((error) => {
      console.error("[healthia] falha ao inicializar Health Connect", error);
    });
  }, []);

  const handleRequestPermissions = useCallback(async () => {
    await requestHealthConnectPermissions();
    setPermissionsGranted(await hasAllHealthConnectPermissions());
  }, []);

  const handleSyncNow = useCallback(async () => {
    setStatus({ kind: "syncing" });
    try {
      const deviceId = await getDeviceId();
      const result = await syncNow(deviceId);
      setStatus({ kind: "done", ...result, at: new Date() });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HealthIA Sync</Text>
      <Text style={styles.subtitle}>Sessão ativa: {session.user.email}</Text>

      {permissionsGranted === false && (
        <View style={styles.card}>
          <Text style={styles.cardText}>
            Permissão do Health Connect ainda não concedida.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleRequestPermissions}>
            <Text style={styles.buttonText}>Conceder permissões</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleSyncNow}
        disabled={status.kind === "syncing"}
      >
        {status.kind === "syncing" ? (
          <ActivityIndicator color="#171717" />
        ) : (
          <Text style={styles.buttonText}>Sincronizar agora</Text>
        )}
      </TouchableOpacity>

      {status.kind === "done" && (
        <Text style={styles.statusText}>
          Última sincronização: {status.at.toLocaleTimeString("pt-BR")} —{" "}
          {status.accepted} aceitos, {status.duplicates} duplicados,{" "}
          {status.failed} falhos.
        </Text>
      )}
      {status.kind === "error" && (
        <Text style={styles.error}>Falha ao sincronizar: {status.message}</Text>
      )}

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.signOutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    padding: 24,
    gap: 16,
  },
  title: {
    color: "#fafafa",
    fontSize: 22,
    fontWeight: "600",
    marginTop: 32,
  },
  subtitle: {
    color: "#a3a3a3",
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: "#404040",
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  cardText: {
    color: "#e5e5e5",
  },
  button: {
    borderWidth: 1,
    borderColor: "#404040",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#fafafa",
    borderColor: "#fafafa",
  },
  buttonText: {
    color: "#171717",
    fontWeight: "600",
  },
  statusText: {
    color: "#a3a3a3",
    fontSize: 13,
  },
  error: {
    color: "#f87171",
    fontSize: 13,
  },
  signOutButton: {
    marginTop: "auto",
    alignItems: "center",
    paddingVertical: 12,
  },
  signOutText: {
    color: "#a3a3a3",
  },
});
