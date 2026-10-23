import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useSol } from "./src/useSol";
import {
  examples,
  feedbackMetrics,
  initialState,
  type Feedback,
} from "./src/model";
import { Button, Card, Chip, colors, styles } from "./src/ui";
import FocusCard from "./src/FocusCard";

type Tab = "night" | "chat" | "rhythm" | "settings";
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "night", label: "Mi noche", icon: "☾" },
  { id: "chat", label: "SOL", icon: "✳" },
  { id: "rhythm", label: "Mi ritmo", icon: "≋" },
  { id: "settings", label: "Ajustes", icon: "⋯" },
];
function confirm(title: string, message: string, action: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(title + "\n\n" + message)) action();
  } else
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Continuar", onPress: action },
    ]);
}
export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.shell}>
        <StatusBar style="light" />
        <SolApp />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function SolApp() {
  const sol = useSol();
  const [tab, setTab] = useState<Tab>("night");
  const [draft, setDraft] = useState("");
  const [url, setUrl] = useState(process.env.EXPO_PUBLIC_API_URL || "");
  const [password, setPassword] = useState("");
  const chat = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const { local, session } = sol;
  const metrics = feedbackMetrics(local?.feedback || {});
  function send(text = draft) {
    const action = () => {
      void sol.send(text).then((ok) => {
        if (ok) setDraft("");
      });
    };
    if (text.trim().toLowerCase() === "borrar" && sol.connection)
      confirm(
        "Borrar conversación del equipo",
        "Se eliminará el contexto del chat compartido en testing. No borra WhatsApp. Este piloto todavía no tiene cuentas individuales.",
        action,
      );
    else action();
  }
  const feedbackLabels: [Feedback, string][] = [
    ["correct", "Bien"],
    ["should-wake", "Debió despertarme"],
    ["should-wait", "No debió despertarme"],
  ];
  if (!sol.loaded)
    return (
      <View style={app.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>Preparando tu espacio…</Text>
      </View>
    );
  return (
    <>
      <View style={app.header}>
        <View>
          <Text style={app.brand}>
            sol<Text style={{ color: colors.accent }}>.</Text>
          </Text>
          <Text style={styles.small}>Menos ruido. Más descanso.</Text>
        </View>
        <View style={app.badge}>
          <View style={app.dot} />
          <Text style={styles.small}>DEMO DEL EQUIPO</Text>
        </View>
      </View>
      {!!sol.error && (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={[styles.small, { color: colors.danger }]}>
            {sol.error}
          </Text>
          {sol.connection && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void sol.refresh()}
              style={{ paddingTop: 12, minHeight: 44 }}
            >
              <Text style={styles.text}>Reintentar conexión ↻</Text>
            </Pressable>
          )}
        </View>
      )}
      {tab === "chat" ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={chat}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              chat.current?.scrollToEnd({ animated: true })
            }
          >
            <Text style={styles.eyebrow}>
              {sol.connection
                ? "CHAT DEL PILOTO · SERVIDOR"
                : "PRUEBA DE DISEÑO · LOCAL"}
            </Text>
            <Text style={styles.title}>Suéltalo aquí.</Text>
            <Text style={styles.muted}>
              {sol.connection
                ? "Esta conversación es compartida por el equipo. Usa ejemplos ficticios."
                : "Anota algo que siga dando vueltas. Esta demo responde con reglas y guarda los cambios en este dispositivo."}
            </Text>
            {!session.messages.length && (
              <View style={app.bubble}>
                <Text style={styles.text}>
                  ¿Qué te gustaría dejar encaminado antes de desconectar?
                </Text>
                <Text style={styles.small}>
                  Prueba: «Me preocupa el informe de mañana».
                </Text>
              </View>
            )}
            {session.messages.map((message) => (
              <View
                key={message.id}
                style={[app.bubble, message.role === "user" && app.userBubble]}
              >
                <Text style={styles.eyebrow}>
                  {message.role === "user" ? "TÚ" : "SOL"}
                </Text>
                <Text selectable style={styles.text}>
                  {message.text}
                </Text>
                {message.role === "assistant" && (
                  <Text style={styles.small}>
                    {message.inference?.engine === "hermes"
                      ? "Respuesta de Hermes"
                      : message.inference?.engine === "unavailable"
                        ? "Modelo no disponible · propuesta pendiente"
                        : message.inference?.engine === "control"
                          ? "Contexto actualizado"
                          : "Simulación guiada · sin modelo"}
                  </Text>
                )}
              </View>
            ))}
            {sol.pending && (
              <Card>
                <Text style={styles.text}>Este envío sigue sin confirmar.</Text>
                <Text style={styles.muted}>{sol.pending.text}</Text>
                <Button
                  title="Reintentar el mismo envío"
                  disabled={sol.busy}
                  onPress={() => send(sol.pending!.text)}
                />
                <Button
                  secondary
                  title="Descartar reintento"
                  disabled={sol.busy}
                  onPress={() =>
                    confirm(
                      "Descartar reintento",
                      "El servidor puede haber recibido el mensaje. Descartarlo no lo borra ni envía uno nuevo.",
                      () => void sol.discardPending(),
                    )
                  }
                />
              </Card>
            )}
          </ScrollView>
          <View style={app.composer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {["MÁS PEQUEÑO", "MEMORIA", "NUEVO"].map((value) => (
                <Chip
                  key={value}
                  title={
                    value === "MÁS PEQUEÑO"
                      ? "Un paso más pequeño"
                      : value === "MEMORIA"
                        ? "Lo que sabes de mí"
                        : "Otro pendiente"
                  }
                  onPress={() => send(value)}
                  disabled={
                    sol.busy ||
                    !!sol.pending ||
                    (!!sol.connection && !sol.remote)
                  }
                />
              ))}
            </ScrollView>
            <View style={[styles.row, { alignItems: "flex-end" }]}>
              <TextInput
                accessibilityLabel="Mensaje para SOL"
                placeholder="Un pendiente ficticio…"
                placeholderTextColor={colors.dim}
                multiline
                maxLength={2000}
                value={draft}
                onChangeText={setDraft}
                editable={!sol.busy && !sol.pending}
                style={[styles.input, { flex: 1, maxHeight: 130 }]}
              />
              <Button
                title="↑"
                onPress={() => send()}
                disabled={
                  sol.busy ||
                  !!sol.pending ||
                  !draft.trim() ||
                  (!!sol.connection && !sol.remote)
                }
                style={{ width: 52 }}
              />
            </View>
            <Text style={[styles.small, { marginTop: 8 }]}>
              {sol.busy
                ? "Guardando…"
                : sol.connection
                  ? "Persistencia en servidor · conversación del equipo"
                  : "Persistencia local · datos ficticios"}
            </Text>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "night" && (
            <>
              <Text style={styles.eyebrow}>PREPARA TU NOCHE</Text>
              <Text style={styles.title}>
                Deja el día{"\n"}un poco más lejos.
              </Text>
              <View style={app.sunSpace} accessibilityElementsHidden>
                <View style={app.orbit} />
                <View style={app.sun} />
                <View style={app.horizon} />
                <Text style={app.sunLabel}>UN MOMENTO PARA BAJAR EL RITMO</Text>
              </View>
              <Card>
                <View style={styles.spread}>
                  <Text style={styles.eyebrow}>TU ACUERDO DE ESTA NOCHE</Text>
                  <Text style={styles.small}>Local</Text>
                </View>
                <Text style={styles.h2}>¿Te toca guardia?</Text>
                <View style={styles.row}>
                  <Button
                    title="Sí, estoy de guardia"
                    secondary={local?.onDuty !== true}
                    disabled={sol.busy || !local}
                    style={{ flex: 1 }}
                    onPress={() =>
                      void sol.update((state) => ({
                        ...state,
                        onDuty: true,
                        confirmedAt: new Date().toISOString(),
                      }))
                    }
                  />
                  <Button
                    title="No, hoy descanso"
                    secondary={local?.onDuty !== false}
                    disabled={sol.busy || !local}
                    style={{ flex: 1 }}
                    onPress={() =>
                      void sol.update((state) => ({
                        ...state,
                        onDuty: false,
                        confirmedAt: new Date().toISOString(),
                      }))
                    }
                  />
                </View>
                <Text style={styles.muted}>
                  {local?.onDuty === true
                    ? "En la propuesta, una urgencia nueva requeriría avisarte. Ante la duda, se revisa."
                    : local?.onDuty === false
                      ? "Hoy elegiste descansar. La política para incidentes graves fuera de guardia sigue pendiente del equipo."
                      : "Una respuesta basta para empezar. Puedes cambiarla."}
                </Text>
                <Text style={styles.small}>
                  Modo sombra: esta demo no silencia mensajes, no envía alertas
                  y no realiza llamadas.
                </Text>
              </Card>
              <Card>
                <Text style={styles.eyebrow}>LO QUE SIGUE EN TU CABEZA</Text>
                <Text style={styles.h2}>
                  {session.concern || "No tienes que resolverlo todo ahora."}
                </Text>
                <Text style={styles.muted}>
                  {session.plan?.nextStep ||
                    "Deja un pendiente anotado y prepara el primer paso para mañana."}
                </Text>
                <Button
                  title={
                    session.concern
                      ? "Retomar con SOL ↗"
                      : "Dejar un pendiente con SOL ↗"
                  }
                  onPress={() => setTab("chat")}
                />
              </Card>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTab("rhythm")}
                style={[styles.spread, { minHeight: 56 }]}
              >
                <View>
                  <Text style={styles.text}>Así habría sido la noche</Text>
                  <Text style={styles.small}>
                    3 ejemplos ficticios · revisa las decisiones
                  </Text>
                </View>
                <Text style={styles.h2}>↗</Text>
              </Pressable>
            </>
          )}
          {tab === "rhythm" && (
            <>
              <Text style={styles.eyebrow}>CONTEXTO QUE CRECE CONTIGO</Text>
              <Text style={styles.title}>Mi ritmo.</Text>
              <Text style={styles.muted}>
                SOL aprende de lo que le confirmas. Una señal de uso no explica
                por sí sola cómo te sientes.
              </Text>
              <Card>
                <Text style={styles.eyebrow}>LO QUE LE CONTASTE</Text>
                {session.memory?.length ? (
                  session.memory.map((item) => (
                    <View key={item.key} style={{ gap: 4 }}>
                      <Text style={styles.text}>{item.value}</Text>
                      {!!item.evidence && (
                        <Text style={styles.small}>
                          Lo dijiste así: «{item.evidence}»
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>
                    {session.preference
                      ? `Prefieres pasos de ${session.preference.minutes} minutos.`
                      : "Todavía no hay preferencias confirmadas. Empieza conversando."}
                  </Text>
                )}
                <Button
                  secondary
                  title="Corregir mi contexto"
                  onPress={() => setTab("chat")}
                />
              </Card>
              <Card>
                <Text style={styles.eyebrow}>MODO SOMBRA · EJEMPLOS</Text>
                <Text style={styles.h2}>
                  {metrics.reviewed
                    ? `${metrics.correct} de ${metrics.reviewed} decisiones aprobadas`
                    : "La confianza se construye."}
                </Text>
                <Text style={styles.muted}>
                  {metrics.reviewed
                    ? "Según tu feedback en estos ejemplos ficticios. No mide precisión en una guardia real."
                    : "Revisa qué habría hecho SOL y corrígelo con un toque."}
                </Text>
                <Text style={styles.small}>
                  El modo real sigue deshabilitado. La demo no se gradúa por
                  acumular estos votos.
                </Text>
              </Card>
              {examples.map((item) => (
                <Card key={item.id}>
                  <View style={styles.spread}>
                    <Text style={styles.small}>{item.time} · FICTICIO</Text>
                    <Text
                      style={[
                        styles.eyebrow,
                        {
                          color:
                            item.decision === "DESPERTAR"
                              ? colors.accent
                              : colors.mint,
                        },
                      ]}
                    >
                      {item.decision}
                    </Text>
                  </View>
                  <Text style={styles.h2}>{item.title}</Text>
                  <Text style={styles.muted}>{item.reason}</Text>
                  {item.decision === "DESPERTAR" && (
                    <Button
                      secondary
                      title={
                        local?.acknowledged.includes(item.id)
                          ? "Visto · guardado localmente"
                          : "Lo vi · probar reconocimiento"
                      }
                      disabled={
                        sol.busy ||
                        !local ||
                        local.acknowledged.includes(item.id)
                      }
                      onPress={() =>
                        void sol.update((state) => ({
                          ...state,
                          acknowledged: [
                            ...new Set([...state.acknowledged, item.id]),
                          ],
                        }))
                      }
                    />
                  )}
                  <View style={styles.wrap}>
                    {feedbackLabels.map(([value, label]) => (
                      <Chip
                        key={value}
                        title={label}
                        selected={local?.feedback[item.id] === value}
                        disabled={sol.busy || !local}
                        onPress={() =>
                          void sol.update((state) => ({
                            ...state,
                            feedback: { ...state.feedback, [item.id]: value },
                          }))
                        }
                      />
                    ))}
                  </View>
                </Card>
              ))}
              <FocusCard />
            </>
          )}
          {tab === "settings" && (
            <>
              <Text style={styles.eyebrow}>TU DEMO, SIN CONFUSIONES</Text>
              <Text style={styles.title}>Conexión y datos.</Text>
              <Card>
                <Text style={styles.h2}>
                  {sol.connection
                    ? "Chat conectado al piloto"
                    : "Estás probando en local"}
                </Text>
                <Text style={styles.muted}>
                  {sol.connection
                    ? "Solo el chat usa la API actual. La guardia, los ejemplos y sus votos se guardan en este dispositivo."
                    : "La conversación, la selección de guardia y el feedback sobreviven al cerrar la app. No se han enviado a una base de datos."}
                </Text>
                {sol.connection && (
                  <>
                    <Text selectable style={styles.small}>
                      {sol.connection.url}
                    </Text>
                    <Text style={styles.small}>
                      {sol.remote?.agent?.engine === "hermes"
                        ? sol.remote.agent.configured
                          ? "Hermes configurado; una respuesta válida comprueba la inferencia."
                          : "Hermes todavía necesita configuración del equipo."
                        : "Motor de la demo: reglas, sin inferencia de IA."}
                    </Text>
                    {sol.syncedAt && (
                      <Text style={styles.small}>
                        Última lectura:{" "}
                        {new Date(sol.syncedAt).toLocaleTimeString()}
                      </Text>
                    )}
                    <Button
                      secondary
                      title="Recargar contexto del servidor"
                      disabled={sol.busy}
                      onPress={() => void sol.refresh()}
                    />
                    <Button
                      secondary
                      title="Volver a la demo local"
                      disabled={sol.busy}
                      onPress={() => void sol.disconnect()}
                    />
                  </>
                )}
              </Card>
              <Card>
                <Text style={styles.h2}>Conectar el chat a testing</Text>
                <Text style={styles.muted}>
                  Usa la URL del backend de esta rama y el acceso de prueba. No
                  uses producción.
                </Text>
                <Text style={styles.small}>URL del backend</Text>
                <TextInput
                  accessibilityLabel="URL del backend de testing"
                  placeholder="https://sol-testing…"
                  placeholderTextColor={colors.dim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  value={url}
                  onChangeText={setUrl}
                  style={styles.input}
                  editable={!sol.busy}
                />
                <Text style={styles.small}>
                  Contraseña de la demo · usuario solsets
                </Text>
                <TextInput
                  accessibilityLabel="Contraseña del equipo"
                  placeholder="Solo si el equipo configuró una"
                  placeholderTextColor={colors.dim}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  editable={!sol.busy}
                />
                <Button
                  title="Comprobar y conectar"
                  disabled={sol.busy || !url.trim()}
                  onPress={() =>
                    void sol.connect({ url, password }).then((ok) => {
                      if (ok) {
                        setPassword("");
                        setTab("chat");
                      }
                    })
                  }
                />
                <Text style={styles.small}>
                  El acceso se conserva en el almacenamiento seguro del
                  teléfono. Este piloto comparte la conversación del equipo;
                  todavía no tiene identidad individual.
                </Text>
                <Text style={styles.small}>
                  Para desarrollo en la misma Wi-Fi, usa la IP del Mac.
                  localhost en el iPhone significa el propio iPhone. La vista
                  web necesita CORS del backend y no prueba por sí sola la
                  conexión nativa.
                </Text>
              </Card>
              <Card>
                <Text style={styles.eyebrow}>CONTINUIDAD</Text>
                <Text style={styles.h2}>
                  WhatsApp es otro punto de entrada.
                </Text>
                <Text style={styles.muted}>
                  El número de Kapso sigue pendiente. Su conversación se
                  conserva por remitente y aún no se vincula a una cuenta móvil.
                </Text>
                {sol.remote?.connection?.chatUrl && (
                  <Button
                    secondary
                    title="Abrir número de prueba"
                    onPress={() =>
                      void Linking.openURL(sol.remote!.connection!.chatUrl!)
                    }
                  />
                )}
              </Card>
              <Card>
                <Text style={styles.eyebrow}>TÚ DECIDES QUÉ SE RECUERDA</Text>
                <Text style={styles.muted}>
                  La selección y los eventos de Screen Time permanecen en el
                  dispositivo. No se envían al chat ni a Hermes.
                </Text>
                <Button
                  secondary
                  title={
                    sol.connection
                      ? "Borrar chat compartido del piloto"
                      : "Borrar chat local"
                  }
                  disabled={sol.busy}
                  onPress={() =>
                    confirm(
                      sol.connection
                        ? "Borrar chat del equipo"
                        : "Borrar chat local",
                      sol.connection
                        ? "Se eliminará el contexto compartido del servidor. No borra WhatsApp."
                        : "Se borrará el contexto y el historial local.",
                      () => void sol.send("BORRAR"),
                    )
                  }
                />
                <Button
                  secondary
                  title="Restablecer ejemplos locales"
                  disabled={sol.busy}
                  onPress={() =>
                    confirm(
                      "Restablecer demo local",
                      "Borra votos, acuerdo de guardia y conversación local. No borra el servidor ni cambia las restricciones de Screen Time.",
                      () => void sol.update(() => initialState()),
                    )
                  }
                />
              </Card>
              <Text style={styles.small}>
                App: Amaru. API: Bishara. Agente y políticas: Quito. El bloqueo
                de apps es un experimento separado de la guardia.
              </Text>
            </>
          )}
        </ScrollView>
      )}
      <View style={app.tabs}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            accessibilityLabel={item.label}
            onPress={() => setTab(item.id)}
            style={[app.tab, tab === item.id && app.activeTab]}
          >
            <Text
              style={[app.tabIcon, tab === item.id && { color: colors.accent }]}
            >
              {item.icon}
            </Text>
            <Text
              style={[styles.small, tab === item.id && { color: colors.ink }]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}
const app = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  brand: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -2,
  },
  badge: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: colors.mint },
  sunSpace: {
    height: 178,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginVertical: -8,
  },
  sun: {
    height: 118,
    width: 118,
    borderRadius: 59,
    backgroundColor: colors.accent,
    position: "absolute",
    top: 16,
  },
  orbit: {
    height: 190,
    width: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: "#59443E",
    position: "absolute",
    top: -19,
  },
  horizon: {
    height: 80,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopColor: "#765345",
    borderTopWidth: 1,
  },
  sunLabel: {
    position: "absolute",
    bottom: 30,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.muted,
  },
  tabs: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  tab: {
    alignItems: "center",
    gap: 2,
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    minHeight: 56,
  },
  activeTab: { backgroundColor: colors.card },
  tabIcon: { fontSize: 23, color: colors.muted, height: 28 },
  bubble: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 22,
    borderTopLeftRadius: 4,
    gap: 8,
    maxWidth: "95%",
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: "#3E3838",
    alignSelf: "flex-end",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 4,
  },
  composer: {
    padding: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
});
