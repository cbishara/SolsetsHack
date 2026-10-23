import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  Heart,
  MessageCircle,
  Plus,
  Sun,
} from "lucide-react-native";
import type { Session } from "./model";
import { Button, Card, Heading, colors, space, styles } from "./ui";

export const examplePrompt =
  "Tengo una compra pendiente y varias cosas para mañana. Quiero ordenarlas antes de descansar.";
type WorkspaceProps = {
  session: Session;
  onChat: (prompt?: string) => void;
  onPending: () => void;
};

export function HomeScreen({ session, onChat, onPending }: WorkspaceProps) {
  return (
    <>
      <Heading
        kicker="Hola, mi espacio"
        title="Haz espacio para ti."
        description="Un lugar para lo que hoy ocupa tu cabeza."
      />
      <View style={s.hero}>
        <View style={styles.spread}>
          <Text style={[styles.eyebrow, s.heroLabel]}>
            TU ASISTENTE PERSONAL
          </Text>
          <Sun size={24} color={colors.lime} accessible={false} />
        </View>
        <Text accessibilityRole="header" style={s.heroTitle}>
          No tienes que{"\n"}llevarlo todo.
        </Text>
        <Text style={s.heroBody}>
          Soy SOL. Cuéntame qué tienes en la cabeza. Encontramos el siguiente
          paso, juntos.
        </Text>
        <Button
          title="Hablemos"
          variant="lime"
          icon={ArrowUpRight}
          onPress={() => onChat()}
          style={{ alignSelf: "flex-start" }}
        />
        <Text style={[styles.small, s.heroLabel]}>
          Una cosa a la vez. A tu ritmo.
        </Text>
      </View>
      <View style={{ gap: space.lg }}>
        <View style={styles.spread}>
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={styles.eyebrow}>Lo importante, a la vista</Text>
            <Text accessibilityRole="header" style={styles.h2}>
              Fuera de tu cabeza.
            </Text>
          </View>
          {session.concern ? (
            <Button title="Ver" variant="quiet" onPress={onPending} />
          ) : null}
        </View>
        {session.concern ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver pendiente: ${session.concern}`}
            onPress={onPending}
            style={({ pressed }) => [
              s.pendingRow,
              { backgroundColor: pressed ? colors.blueSoft : colors.surface },
            ]}
          >
            <FileText size={24} color={colors.accent} accessible={false} />
            <View style={{ flex: 1, gap: space.xs }}>
              <Text style={styles.text}>{session.concern}</Text>
              <Text style={[styles.small, { color: colors.accent }]}>
                {session.plan
                  ? "Primer paso preparado · Por revisar"
                  : "Anotado · Por revisar"}
              </Text>
            </View>
            <ArrowUpRight size={20} color={colors.accent} accessible={false} />
          </Pressable>
        ) : (
          <Card>
            <ArrowUpRight size={32} color={colors.accent} accessible={false} />
            <Text accessibilityRole="header" style={styles.h2}>
              Aquí empieza un poco de calma.
            </Text>
            <Text style={styles.muted}>
              Cuéntale a SOL un pendiente. No necesitas tenerlo todo ordenado.
            </Text>
            <Button
              title="Preparar mi primer pendiente"
              secondary
              onPress={() => onChat()}
            />
          </Card>
        )}
      </View>
      <View style={s.example}>
        <Text style={styles.eyebrow}>Empieza por algo pequeño</Text>
        <Text accessibilityRole="header" style={styles.h2}>
          Mañana empieza más liviano.
        </Text>
        <Text style={styles.muted}>
          Transforma una lista desordenada en un primer paso concreto.
        </Text>
        <Button
          title="Probar este ejemplo"
          variant="quiet"
          icon={ArrowRight}
          onPress={() => onChat(examplePrompt)}
          style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
        />
        <Text style={styles.small}>
          Ejemplo ficticio · Puedes editarlo antes de enviar
        </Text>
      </View>
      <Text style={[styles.small, { textAlign: "center" }]}>
        Menos en tu cabeza. Más vida.
      </Text>
    </>
  );
}

export function PendingScreen({
  session,
  onChat,
  onNew,
  disabled,
  connected,
}: {
  session: Session;
  onChat: () => void;
  onNew: () => void;
  disabled: boolean;
  connected: boolean;
}) {
  return (
    <>
      <Heading
        kicker="Mis pendientes"
        title="Todo tiene su lugar."
        description="Deja un primer paso preparado, para volver con más calma."
      />
      {session.concern ? (
        <>
          <View style={s.status}>
            <FileText size={18} color={colors.accent} accessible={false} />
            <Text style={[styles.muted, { color: colors.accent }]}>
              Pendiente actual · Por revisar
            </Text>
          </View>
          <Text selectable accessibilityRole="header" style={styles.h2}>
            {session.concern}
          </Text>
          {session.plan ? (
            <Card style={{ backgroundColor: colors.surface }}>
              <View style={styles.spread}>
                <Text style={styles.eyebrow}>Un primer paso</Text>
                {session.plan.minutes ? (
                  <Text
                    style={[styles.small, { fontVariant: ["tabular-nums"] }]}
                  >
                    {session.plan.minutes} min propuestos
                  </Text>
                ) : null}
              </View>
              <Text accessibilityRole="header" style={styles.h2}>
                {session.plan.title}
              </Text>
              <Text selectable style={styles.text}>
                {session.plan.nextStep}
              </Text>
              {session.plan.prepared ? (
                <>
                  <View style={styles.rule} />
                  <Text style={styles.eyebrow}>Borrador preparado</Text>
                  <Text selectable style={styles.text}>
                    {session.plan.prepared}
                  </Text>
                </>
              ) : null}
              <Button
                title="Revisar con SOL"
                icon={MessageCircle}
                onPress={onChat}
              />
            </Card>
          ) : (
            <Button title="Preparar el siguiente paso" onPress={onChat} />
          )}
          <Text style={styles.muted}>
            Está preparado para que lo revises. Todavía no se ha enviado ni
            marcado como resuelto.
          </Text>
          <Button
            title="Empezar otro pendiente"
            secondary
            icon={Plus}
            onPress={onNew}
            disabled={disabled}
          />
          <Text style={styles.small}>
            {connected
              ? "El piloto muestra un pendiente a la vez. Empezar otro reemplaza el pendiente y su historial; conserva las preferencias."
              : "Esta demo muestra un pendiente a la vez. La conversación conserva lo que trabajaste antes."}
          </Text>
        </>
      ) : (
        <Card>
          <FileText size={32} color={colors.accent} accessible={false} />
          <Text accessibilityRole="header" style={styles.h2}>
            Una cosa basta para empezar.
          </Text>
          <Text style={styles.muted}>
            Puede ser una compra, un mensaje o algo de mañana. SOL te ayuda a
            encontrar por dónde seguir.
          </Text>
          <Button title="Contárselo a SOL" onPress={onChat} />
        </Card>
      )}
    </>
  );
}

export function MemoryScreen({
  session,
  onSmallStep,
  onCorrect,
  onClear,
  disabled,
  connected,
}: {
  session: Session;
  onSmallStep: () => void;
  onCorrect: () => void;
  onClear: () => void;
  disabled: boolean;
  connected: boolean;
}) {
  const memories = session.memory?.length
    ? session.memory
    : session.preference
      ? [
          {
            key: "step-length",
            value: `Prefieres pasos de ${session.preference.minutes} minutos.`,
            evidence: undefined,
          },
        ]
      : [];
  return (
    <>
      <Heading
        kicker="Lo que SOL recuerda"
        title="SOL, a tu manera."
        description="Contexto visible y bajo tu control."
      />
      <View style={s.memoryIntro}>
        <Heart size={28} color={colors.accent} accessible={false} />
        <Text style={[styles.text, { flex: 1 }]}>
          Lo que compartes ayuda a encontrar un paso que te resulte más fácil.
        </Text>
      </View>
      <View style={{ gap: space.lg }}>
        <Text accessibilityRole="header" style={styles.h2}>
          Lo que recuerdo de ti.
        </Text>
        {memories.length ? (
          memories.map((item) => (
            <View key={item.key} style={s.memoryRow}>
              <Text selectable style={styles.text}>
                {item.value}
              </Text>
              {item.evidence ? (
                <Text selectable style={styles.small}>
                  Lo dijiste así: «{item.evidence}»
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <View style={s.memoryRow}>
            <Text style={styles.text}>Aún no hay preferencias guardadas.</Text>
            <Text style={styles.muted}>
              Puedes probar una: empezar con pasos de dos minutos.
            </Text>
          </View>
        )}
        <Button
          title={
            session.preference?.minutes === 2
              ? "Pasos de 2 minutos guardados"
              : "Preferir pasos de 2 minutos"
          }
          secondary
          disabled={disabled || session.preference?.minutes === 2}
          onPress={onSmallStep}
        />
        <Button
          title="Corregir con SOL"
          variant="quiet"
          onPress={onCorrect}
          disabled={disabled}
        />
        {!connected ? (
          <Text style={styles.small}>
            La demo local solo aprende la preferencia de pasos de dos minutos.
            Las correcciones libres necesitan el asistente conectado.
          </Text>
        ) : null}
      </View>
      <View style={s.example}>
        <Text accessibilityRole="header" style={styles.h2}>
          Tú decides qué se queda.
        </Text>
        <Text style={styles.muted}>
          {connected
            ? "Este contexto pertenece al chat compartido de pruebas del equipo."
            : "Estas preferencias y tu conversación se guardan en este dispositivo."}
        </Text>
        <Text style={styles.muted}>
          En esta demo puedes borrar juntos la conversación, el pendiente y las
          preferencias.
        </Text>
        <Button
          title="Borrar conversación y memoria"
          variant="danger"
          disabled={disabled}
          onPress={onClear}
          style={{ paddingHorizontal: 0, alignSelf: "flex-start" }}
        />
      </View>
      <Text style={styles.small}>
        Recordar una preferencia no da permiso para enviar mensajes ni hacer
        cambios en otras apps.
      </Text>
    </>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    borderCurve: "continuous",
    padding: space.xxl,
    gap: space.lg,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "500",
    letterSpacing: -1.3,
  },
  heroBody: { color: colors.heroMuted, fontSize: 17, lineHeight: 25 },
  heroLabel: { color: colors.heroMuted },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: 16,
    minHeight: 80,
  },
  example: {
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.xxl,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.sm,
  },
  memoryIntro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.lg,
    backgroundColor: colors.blueSoft,
    padding: space.xl,
    borderRadius: 16,
  },
  memoryRow: {
    gap: space.sm,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
