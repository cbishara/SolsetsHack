import React, { memo, useCallback, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowUp, ArrowUpRight, FileText, Sun } from "lucide-react-native";
import type { Message, Session } from "./model";
import type { PendingTurn } from "./api";
import { Button, Card, Chip, Heading, colors, space, styles } from "./ui";
import { examplePrompt } from "./workspace-screens";

type Props = {
  session: Session;
  draft: string;
  setDraft: (text: string) => void;
  busy: boolean;
  blocked: boolean;
  refreshing: boolean;
  connected: boolean;
  pending: PendingTurn | null;
  onSend: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  onRefresh: () => void;
  onPending: () => void;
  onSmallStep: () => void;
  onSettings: () => void;
};
const MessageRow = memo(function MessageRow({ message }: { message: Message }) {
  const user = message.role === "user";
  return (
    <View style={[s.message, user ? s.user : s.assistant]}>
      <Text style={[styles.small, s.speaker, user && s.white]}>
        {user ? "TÚ" : "SOL"}
      </Text>
      <Text selectable style={[styles.text, user && s.white]}>
        {message.text}
      </Text>
      {message.inference?.error ||
      message.inference?.engine === "unavailable" ||
      message.inference?.engine === "hermes-unavailable" ? (
        <Text
          style={[styles.small, { color: user ? colors.white : colors.danger }]}
        >
          SOL no pudo usar la IA. Tu mensaje quedó registrado.
        </Text>
      ) : null}
    </View>
  );
});
const messageKey = (message: Message) => message.id;
const renderMessage = ({ item }: { item: Message }) => (
  <MessageRow message={item} />
);

export function ChatScreen(p: Props) {
  const list = useRef<FlatList<Message>>(null);
  const following = useRef(true);
  const lastId = useRef(p.session.messages.at(-1)?.id);
  const newest = p.session.messages.at(-1);
  useEffect(() => {
    if (
      newest?.id &&
      newest.id !== lastId.current &&
      newest.role === "assistant"
    ) {
      AccessibilityInfo.announceForAccessibility(
        "SOL respondió. " + newest.text.slice(0, 180),
      );
    }
    lastId.current = newest?.id;
  }, [newest?.id]);
  const followContent = useCallback(() => {
    if (following.current) list.current?.scrollToEnd({ animated: false });
  }, []);
  return (
    <KeyboardAvoidingView
      style={styles.shell}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={list}
        data={p.session.messages}
        keyExtractor={messageKey}
        renderItem={renderMessage}
        contentContainerStyle={s.history}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={followContent}
        onScroll={({ nativeEvent: e }) => {
          following.current =
            e.contentSize.height -
              e.layoutMeasurement.height -
              e.contentOffset.y <
            100;
        }}
        scrollEventThrottle={100}
        refreshControl={
          p.connected ? (
            <RefreshControl
              refreshing={p.refreshing}
              onRefresh={p.onRefresh}
              tintColor={colors.accent}
            />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={{ gap: space.lg, paddingBottom: space.xxl }}>
            <Heading
              kicker="Hablar con SOL"
              title="Vamos de a uno."
              description="Con un pendiente basta para empezar. Lo demás puede venir después."
            />
            <Text style={styles.small}>
              {p.connected
                ? "Chat compartido del equipo · Usa ejemplos ficticios"
                : "Demo local · Respuestas de ejemplo"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          p.blocked ? (
            <Text style={styles.muted}>
              El historial aparecerá cuando recuperemos la conexión.
            </Text>
          ) : (
            <View style={s.empty}>
              <View style={s.solMark}>
                <Sun size={28} color={colors.accent} accessible={false} />
              </View>
              <Text accessibilityRole="header" style={styles.h2}>
                ¿Qué tienes en la cabeza?
              </Text>
              <Text style={styles.text}>
                Escríbelo como salga. Podemos encontrar una cosa pequeña que
                deje el resto más liviano.
              </Text>
              <Button
                title="Usar un ejemplo"
                secondary
                icon={ArrowUpRight}
                disabled={p.blocked || !!p.draft.trim()}
                onPress={() => p.setDraft(examplePrompt)}
              />
            </View>
          )
        }
        ListFooterComponent={
          <View style={{ gap: space.lg }}>
            {p.busy ? (
              <View style={styles.row} accessibilityLiveRegion="polite">
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.muted}>
                  SOL está preparando una respuesta…
                </Text>
              </View>
            ) : null}
            {p.pending ? (
              <Card style={{ backgroundColor: colors.surface }}>
                <Text accessibilityRole="header" style={styles.h2}>
                  Este envío aún no está confirmado.
                </Text>
                <Text selectable style={styles.muted}>
                  {p.pending.text}
                </Text>
                <Text style={styles.small}>
                  Reintentar consulta el mismo envío. Descartarlo no lo borra si
                  el servidor ya lo recibió.
                </Text>
                {p.connected ? (
                  <Button
                    title="Reintentar este envío"
                    disabled={p.busy}
                    onPress={p.onRetry}
                  />
                ) : (
                  <Button title="Recuperar conexión" onPress={p.onSettings} />
                )}
                <Button
                  title="Descartar reintento"
                  variant="quiet"
                  disabled={p.busy}
                  onPress={p.onDiscard}
                />
              </Card>
            ) : null}
            {p.session.concern ? (
              <>
                <Button
                  title="Ver el pendiente preparado"
                  variant="quiet"
                  icon={FileText}
                  onPress={p.onPending}
                />
                <View style={styles.wrap}>
                  <Chip
                    title="Hagámoslo más pequeño"
                    disabled={p.busy || p.blocked || !!p.pending}
                    onPress={p.onSmallStep}
                  />
                </View>
              </>
            ) : null}
          </View>
        }
      />
      <View style={s.composerWrap}>
        <View style={s.composer}>
          <TextInput
            accessibilityLabel="Mensaje para SOL"
            placeholder="Lo que sigue dando vueltas…"
            placeholderTextColor={colors.muted}
            value={p.draft}
            onChangeText={p.setDraft}
            multiline
            maxLength={2000}
            editable={!p.busy}
            style={s.input}
            textAlignVertical="top"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            accessibilityState={{
              disabled: !p.draft.trim() || p.busy || p.blocked || !!p.pending,
              busy: p.busy,
            }}
            disabled={!p.draft.trim() || p.busy || p.blocked || !!p.pending}
            onPress={() => {
              following.current = true;
              p.onSend();
            }}
            style={({ pressed }) => [
              s.send,
              {
                opacity:
                  !p.draft.trim() || p.busy || p.blocked || p.pending
                    ? 0.4
                    : pressed
                      ? 0.7
                      : 1,
              },
            ]}
          >
            <ArrowUp size={24} color={colors.white} accessible={false} />
          </Pressable>
        </View>
        <Text style={[styles.small, { textAlign: "center" }]}>
          {p.pending
            ? "Revisa el envío pendiente antes de enviar otro."
            : "No necesitas tenerlo todo ordenado."}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  history: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: space.xl,
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  message: {
    padding: space.lg,
    gap: space.sm,
    borderRadius: 20,
    borderCurve: "continuous",
    maxWidth: "94%",
  },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 4,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  white: { color: colors.white },
  speaker: { fontWeight: "600", letterSpacing: 1 },
  empty: { gap: space.lg, paddingVertical: space.lg },
  solMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blueSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  composerWrap: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  composer: {
    borderWidth: 1,
    borderColor: colors.inputLine,
    borderRadius: 24,
    padding: space.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 17,
    lineHeight: 24,
    paddingHorizontal: space.sm,
    paddingTop: space.md,
    paddingBottom: space.md,
    minHeight: 48,
    maxHeight: 160,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
});
