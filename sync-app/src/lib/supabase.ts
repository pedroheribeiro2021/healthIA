import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../config/env";
import { secureStoreAdapter } from "./secureStoreAdapter";

// Mesmo projeto/schema do web app; login único com a conta do Pedro
// (docs/ARCHITECTURE.md — sem cadastro, RLS trava no UUID dele).
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: "healthia" },
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Exigido pelo supabase-js em React Native (não recebe evento de foco de
// `window` como browser): sem isso o timer de autoRefreshToken não é
// pausado/retomado de forma confiável nas transições de foreground/background,
// e o token pode expirar em silêncio enquanto o app está minimizado — a causa
// mais provável de o sync em background falhar sem deixar rastro (ver veredito
// em notas/Pendencias.md, Fase 7 Etapa 0.2).
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
