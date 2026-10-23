import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BottomSheet, Host } from "@expo/ui";
import {
  ArrowUpRight,
  FileText,
  Heart,
  House,
  MessageCircle,
  Settings,
  X,
} from "lucide-react-native";
import { useSol } from "./src/useSol";
import {
  Button,
  Card,
  Heading,
  IconButton,
  colors,
  space,
  styles,
} from "./src/ui";
import {
  HomeScreen,
  MemoryScreen,
  PendingScreen,
} from "./src/workspace-screens";
import { ChatScreen } from "./src/chat-screen";
import FocusCard from "./src/FocusCard";

type Tab = "home" | "chat" | "pending" | "memory";
const tabs = [
  { id: "home" as const, label: "Mi espacio", icon: House },
  { id: "chat" as const, label: "SOL", icon: MessageCircle },
  { id: "pending" as const, label: "Pendientes", icon: FileText },
  { id: "memory" as const, label: "Memoria", icon: Heart },
];
function confirm(
  title: string,
  message: string,
  action: () => void,
  destructive = false,
) {
  if (Platform.OS === "web") {
    if (window.confirm(title + "\n\n" + message)) action();
  } else
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: destructive ? "Borrar" : "Continuar",
        style: destructive ? "destructive" : "default",
        onPress: action,
      },
    ]);
}
export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.shell}>
        <StatusBar style="dark" />
        <SolApp />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function SolApp() {
  const sol = useSol();
  const [tab, setTab] = useState<Tab>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const draftRef = useRef(sol.draft);
  draftRef.current = sol.draft;
  const { session } = sol;
  const dataUnavailable =
    !sol.storageReady || (!!sol.connection && !sol.remote);
  const disabled = sol.busy || dataUnavailable || !!sol.pending;
  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (settingsOpen) {
        setSettingsOpen(false);
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => back.remove();
  }, [tab, settingsOpen]);
  function navigate(next: Tab) {
    setTab(next);
    AccessibilityInfo.announceForAccessibility(
      tabs.find((item) => item.id === next)?.label || "SOL",
    );
  }
  function openChat(prompt?: string) {
    const enter = () => {
      if (prompt) sol.setDraft(prompt);
      navigate("chat");
    };
    if (prompt && sol.draft.trim() && sol.draft !== prompt)
      confirm(
        "Ya tienes un borrador",
        "Esto reemplazará el texto que todavía no enviaste.",
        enter,
      );
    else enter();
  }
  async function submit(text: string, fromComposer = false) {
    const ok = await sol.send(text);
    if (ok && fromComposer && draftRef.current.trim() === text.trim()) sol.setDraft("");
    return ok;
  }
  function clearConversation(fromComposer = false) {
    const text = fromComposer ? sol.draft : "BORRAR";
    confirm(
      sol.connection
        ? "Borrar el chat compartido"
        : "Borrar conversación y memoria",
      sol.connection
        ? "Se borrarán la conversación de pruebas del equipo, su pendiente y sus preferencias. No borra WhatsApp. Esta acción no se puede deshacer."
        : "Se borrarán la conversación, el pendiente y las preferencias guardados en este dispositivo. Esta acción no se puede deshacer.",
      () => {
        void submit(text, fromComposer).then((ok) => {
          if (ok)
            AccessibilityInfo.announceForAccessibility(
              "Conversación y memoria borradas.",
            );
        });
      },
      true,
    );
  }
  function sendComposer() {
    if (sol.draft.trim().toLowerCase() === "borrar") clearConversation(true);
    else void submit(sol.draft, true);
  }
  function newPending() {
    const start = () => {
      void submit("NUEVO").then((ok) => {
        if (ok) openChat();
      });
    };
    if (session.concern || session.messages.length)
      confirm(
        "Empezar otro pendiente",
        sol.connection
          ? "El piloto reemplazará el pendiente y el historial de esta conversación compartida. Conservará tus preferencias."
          : "El pendiente actual dejará de aparecer en esta vista. Su conversación y tus preferencias se conservan.",
        start,
      );
    else openChat();
  }
  function smallerStep() {
    void submit("MÁS PEQUEÑO").then((ok) => {
      if (ok) openChat();
    });
  }
  function preferTwoMinutes() {
    void submit("Prefiero empezar con pasos de dos minutos.").then((ok) => {
      if (ok) openChat();
    });
  }
  function discard() {
    confirm(
      "Descartar este reintento",
      "El mensaje puede haber llegado al servidor. Esto solo quita el envío pendiente de este dispositivo.",
      () => {
        void sol.discardPending();
      },
    );
  }
  if (!sol.loaded)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>Preparando tu espacio…</Text>
      </View>
    );
  const mode = !sol.connection
    ? "Demo local"
    : sol.refreshing
      ? "Actualizando…"
      : sol.error
        ? "Revisar conexión"
        : "Piloto del equipo";
  return (
    <>
      <View style={s.header}>
        <View style={s.brandRow}>
          <Text style={s.brand}>solsets</Text>
          <ArrowUpRight size={28} color={colors.accent} accessible={false} />
        </View>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode + ". Abrir ajustes"}
            onPress={() => setSettingsOpen(true)}
            style={s.mode}
          >
            <View
              style={[
                s.dot,
                { backgroundColor: sol.error ? colors.danger : colors.accent },
              ]}
            />
            <Text style={styles.small}>{mode}</Text>
          </Pressable>
          <IconButton
            label="Abrir ajustes"
            icon={Settings}
            onPress={() => setSettingsOpen(true)}
          />
        </View>
      </View>
      {sol.error ? (
        <View style={s.errorWrap}>
          <View style={styles.error} accessibilityRole="alert">
            <Text style={[styles.muted, { color: colors.danger }]}>
              {sol.error}
            </Text>
            {!sol.storageReady ? (
              <Button
                title="Reintentar lectura"
                variant="quiet"
                loading={sol.busy}
                onPress={() => void sol.retryStorage()}
              />
            ) : sol.pending ? (
              <Button
                title="Revisar envío pendiente"
                variant="quiet"
                onPress={() => openChat()}
              />
            ) : sol.connection ? (
              <Button
                title="Reintentar conexión"
                variant="quiet"
                loading={sol.refreshing}
                disabled={sol.busy}
                onPress={() => void sol.refresh()}
              />
            ) : null}
          </View>
        </View>
      ) : null}
      {dataUnavailable &&
      !(sol.storageReady && sol.pending && tab === "chat") ? (
        <View style={s.center}>
          {sol.refreshing ? <ActivityIndicator color={colors.accent} /> : null}
          <Text accessibilityRole="header" style={styles.h2}>
            {sol.storageReady
              ? "Recuperando tu conversación"
              : "No pudimos abrir tus datos"}
          </Text>
          <Text style={styles.muted}>
            {sol.storageReady
              ? "Tu contexto aparecerá al recuperar la conexión."
              : "Reintenta la lectura. No se han reemplazado tus datos guardados."}
          </Text>
        </View>
      ) : tab === "chat" ? (
        <ChatScreen
          session={session}
          draft={sol.draft}
          setDraft={sol.setDraft}
          busy={sol.busy}
          blocked={dataUnavailable}
          refreshing={sol.refreshing}
          connected={!!sol.connection}
          pending={sol.pending}
          onSend={sendComposer}
          onRetry={() => {
            if (sol.pending)
              void submit(sol.pending.text, sol.draft.trim() === sol.pending.text.trim());
          }}
          onDiscard={discard}
          onRefresh={() => void sol.refresh()}
          onPending={() => navigate("pending")}
          onSmallStep={smallerStep}
          onSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <ScrollView
          key={tab}
          contentContainerStyle={styles.page}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            sol.connection ? (
              <RefreshControl
                refreshing={sol.refreshing}
                onRefresh={() => void sol.refresh()}
                tintColor={colors.accent}
              />
            ) : undefined
          }
        >
          {sol.pending ? (
            <Button
              title="Hay un envío por confirmar"
              secondary
              onPress={() => openChat()}
            />
          ) : null}
          {tab === "home" ? (
            <HomeScreen
              session={session}
              onChat={openChat}
              onPending={() => navigate("pending")}
            />
          ) : null}
          {tab === "pending" ? (
            <PendingScreen
              session={session}
              connected={!!sol.connection}
              onChat={() => openChat()}
              onNew={newPending}
              disabled={disabled}
            />
          ) : null}
          {tab === "memory" ? (
            <MemoryScreen
              session={session}
              onSmallStep={preferTwoMinutes}
              onCorrect={() => openChat()}
              onClear={() => clearConversation()}
              disabled={disabled}
              connected={!!sol.connection}
            />
          ) : null}
        </ScrollView>
      )}
      <View style={s.tabBar} accessibilityRole="tablist">
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => navigate(item.id)}
            style={({ pressed }) => [
              s.tab,
              pressed && { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[
                s.tabIcon,
                tab === item.id && { backgroundColor: colors.blueSoft },
              ]}
            >
              <item.icon
                size={22}
                color={tab === item.id ? colors.accent : colors.muted}
                accessible={false}
              />
            </View>
            <Text
              style={[
                styles.small,
                s.tabLabel,
                tab === item.id && { color: colors.accent, fontWeight: "700" },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <SettingsSheet
        sol={sol}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConnected={() => {
          setSettingsOpen(false);
          navigate("chat");
        }}
      />
    </>
  );
}

function SettingsSheet({
  sol,
  open,
  onClose,
  onConnected,
}: {
  sol: ReturnType<typeof useSol>;
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [url, setUrl] = useState<string>(process.env.EXPO_PUBLIC_API_URL || "");
  const [password, setPassword] = useState("");
  const [linkError, setLinkError] = useState("");
  useEffect(() => {
    if (open)
      setUrl((previous) => sol.pending?.url || sol.connection?.url || previous);
  }, [open, sol.connection?.url, sol.pending?.url]);
  const rawWhatsapp = sol.remote?.connection?.chatUrl;
  const whatsapp =
    typeof rawWhatsapp === "string" &&
    /^https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(
      rawWhatsapp,
    )
      ? rawWhatsapp
      : null;
  return (
    <Host
      colorScheme="light"
      seedColor={colors.accent}
      style={{ position: "absolute" }}
    >
      <BottomSheet
        isPresented={open}
        onDismiss={onClose}
        snapPoints={["full"]}
        containerColor={colors.bg}
        contentPadding={0}
      >
        <KeyboardAvoidingView
          style={styles.shell}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={s.sheetHeader}>
            <Text accessibilityRole="header" style={styles.h2}>
              Ajustes
            </Text>
            <IconButton label="Cerrar ajustes" icon={X} onPress={onClose} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.page}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            <Heading
              title="Tu espacio, conectado."
              description="Aquí puedes revisar dónde se guarda tu conversación y conectar el piloto del equipo."
            />
            <Card>
              <Text accessibilityRole="header" style={styles.h2}>
                {sol.connection
                  ? "Chat del equipo"
                  : "Demo en este dispositivo"}
              </Text>
              <Text style={styles.muted}>
                {sol.connection
                  ? "Este piloto comparte una conversación de prueba. Usa ejemplos ficticios; todavía no tiene cuentas individuales."
                  : "La conversación y las preferencias quedan guardadas aquí. Las respuestas son ejemplos con reglas, sin IA ni conexión a una base de datos."}
              </Text>
              {sol.connection ? (
                <>
                  <Text selectable style={styles.small}>
                    {sol.connection.url}
                  </Text>
                  <Text style={styles.small}>
                    {sol.remote?.agent?.engine === "hermes"
                      ? sol.remote.agent.configured
                        ? "Hermes figura configurado. Una respuesta válida comprueba la inferencia."
                        : "Hermes todavía necesita configuración del equipo."
                      : sol.remote?.agent?.engine === "demo"
                        ? "Motor de la demo: reglas."
                        : "El servidor no informó qué motor está usando."}
                  </Text>
                  {sol.syncedAt ? (
                    <Text style={styles.small}>
                      Última lectura:{" "}
                      {new Date(sol.syncedAt).toLocaleTimeString("es-CL")}
                    </Text>
                  ) : null}
                  <Button
                    title="Actualizar conversación"
                    secondary
                    loading={sol.refreshing}
                    disabled={sol.busy}
                    onPress={() => void sol.refresh()}
                  />
                  <Button
                    title="Volver a la demo local"
                    variant="quiet"
                    disabled={sol.busy || !!sol.pending}
                    onPress={() => {
                      void sol.disconnect();
                    }}
                  />
                </>
              ) : null}
            </Card>
            <View style={{ gap: space.md }}>
              <Text accessibilityRole="header" style={styles.h2}>
                Conectar el piloto
              </Text>
              <Text style={styles.muted}>
                Ingresa el servidor de pruebas y el acceso que te comparta el
                equipo.
              </Text>
              <Text style={styles.muted}>URL del servidor</Text>
              <TextInput
                accessibilityLabel="URL del servidor de pruebas"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://…"
                placeholderTextColor={colors.muted}
                style={styles.input}
                editable={!sol.busy}
              />
              <Text style={styles.muted}>Contraseña de pruebas</Text>
              <TextInput
                accessibilityLabel="Contraseña de pruebas"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Acceso del equipo"
                placeholderTextColor={colors.muted}
                style={styles.input}
                editable={!sol.busy}
              />
              <Button
                title="Conectar"
                loading={sol.busy}
                disabled={!url.trim() || !sol.storageReady}
                onPress={() => {
                  void sol.connect({ url, password }).then((ok) => {
                    if (ok) {
                      setPassword("");
                      onConnected();
                    }
                  });
                }}
              />
              {sol.error ? (
                <Text
                  accessibilityRole="alert"
                  style={[styles.muted, { color: colors.danger }]}
                >
                  {sol.error}
                </Text>
              ) : null}
              <Text style={styles.small}>
                {Platform.OS === "web"
                  ? "En web el acceso se conserva solo durante esta sesión. El borrador sí se guarda."
                  : "La contraseña se guarda con el almacenamiento seguro del teléfono."}
              </Text>
            </View>
            <View style={styles.rule} />
            <View style={{ gap: space.md }}>
              <Text accessibilityRole="header" style={styles.h2}>
                SOL en WhatsApp
              </Text>
              <Text style={styles.muted}>
                {whatsapp
                  ? "Hay un enlace de prueba disponible. La continuidad de memoria entre este chat y WhatsApp todavía debe verificarse."
                  : "La conexión con WhatsApp está pendiente. Falta habilitar el número de pruebas y vincularlo a este chat."}
              </Text>
              {whatsapp ? (
                <Button
                  title="Abrir WhatsApp de prueba"
                  secondary
                  icon={ArrowUpRight}
                  onPress={() => {
                    void Linking.openURL(whatsapp).catch(() =>
                      setLinkError(
                        "No se pudo abrir WhatsApp. Vuelve a intentarlo.",
                      ),
                    );
                  }}
                />
              ) : null}
              {linkError ? (
                <Text
                  accessibilityRole="alert"
                  style={[styles.muted, { color: colors.danger }]}
                >
                  {linkError}
                </Text>
              ) : null}
            </View>
            <FocusCard />
            <Text style={styles.small}>SOL · Demo del equipo</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
    </Host>
  );
}
const s = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    flexWrap: "wrap",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  brand: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -1.5,
  },
  mode: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    maxWidth: 160,
    flexShrink: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xxl,
    gap: space.lg,
  },
  errorWrap: {
    padding: space.md,
    paddingBottom: 0,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: space.xs,
    paddingVertical: space.xs,
    backgroundColor: colors.bg,
  },
  tab: {
    flex: 1,
    minHeight: 64,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    borderRadius: 12,
  },
  tabIcon: {
    borderRadius: 16,
    paddingVertical: space.xs,
    paddingHorizontal: space.lg,
  },
  tabLabel: { textAlign: "center", flexShrink: 1 },
  sheetHeader: {
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
