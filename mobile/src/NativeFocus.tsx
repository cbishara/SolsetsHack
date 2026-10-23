import React, { useEffect, useState } from "react";
import { AppState, Modal, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Device from "react-native-device-activity";
import { Button, Card, Chip, styles } from "./ui";
import { focusSchedule } from "./focus-schedule";

const SELECTION = "sol-selected-apps",
  ACTIVITY = "sol-selected-apps-session",
  STATE = "sol-session-v1";
type NativeSession = { mode: "focus" | "observe"; endsAt: string };
// This module has no network client. Tokens, selections and activity never leave the device.
export default function NativeFocus() {
  const [authorized, setAuthorized] = useState(
    Device.getAuthorizationStatus() === Device.AuthorizationStatus.approved,
  );
  const [picker, setPicker] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(false),
    [minutes, setMinutes] = useState(15);
  const [session, setSession] = useState<NativeSession | null>(null);
  const [events, setEvents] = useState<Device.EventParsed[]>([]);
  const [status, setStatus] = useState("");
  const selection = { activitySelectionId: SELECTION };

  function refresh() {
    setAuthorized(
      Device.getAuthorizationStatus() === Device.AuthorizationStatus.approved,
    );
    const metadata = Device.activitySelectionMetadata(selection);
    setSelected(
      !!metadata &&
        metadata.applicationCount +
          metadata.categoryCount +
          metadata.webDomainCount >
          0,
    );
    let saved = Device.userDefaultsGet<NativeSession>(STATE) || null;
    if (saved && Date.now() >= Date.parse(saved.endsAt)) {
      Device.unblockSelection(selection);
      Device.stopMonitoring([ACTIVITY]);
      Device.userDefaultsRemove(STATE);
      saved = null;
      setStatus("La sesión terminó. Puedes iniciar otra cuando quieras.");
    }
    setSession(saved);
    setEvents(Device.getEvents(ACTIVITY));
  }
  useEffect(() => {
    refresh();
    const activity = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const native = Device.onDeviceActivityMonitorEvent(refresh);
    const authorization = Device.onAuthorizationStatusChange(refresh);
    return () => {
      activity.remove();
      native.remove();
      authorization.remove();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      refresh();
    } catch (e) {
      setError(
        (e as Error).message || "iOS no pudo aplicar esta configuración.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function start(mode: NativeSession["mode"]) {
    if (!selected || !authorized || session) return;
    const duration = mode === "observe" ? 60 : minutes;
    const { schedule, endsAt } = focusSchedule(duration);
    Device.updateShield(
      {
        title: "Este rato es para ti.",
        subtitle:
          "La pausa termina a la hora que elegiste. Puedes finalizarla desde SOL.",
        primaryButtonLabel: "Volver a mi pausa",
        iconSystemName: "moon.stars.fill",
      },
      { primary: { behavior: "close" } },
    );
    Device.configureActions({
      activityName: ACTIVITY,
      callbackName: "intervalDidStart",
      actions:
        mode === "focus"
          ? [{ type: "blockSelection", familyActivitySelectionId: SELECTION }]
          : [],
    });
    Device.configureActions({
      activityName: ACTIVITY,
      callbackName: "intervalDidEnd",
      actions: [
        { type: "unblockSelection", familyActivitySelectionId: SELECTION },
      ],
    });
    Device.configureActions({
      activityName: ACTIVITY,
      callbackName: "eventDidReachThreshold",
      eventName: "selected-15m",
      actions: [],
    });
    try {
      await Device.startMonitoring(
        ACTIVITY,
        schedule,
        mode === "observe"
          ? [
              {
                eventName: "selected-15m",
                familyActivitySelection:
                  Device.getFamilyActivitySelectionId(SELECTION)!,
                threshold: { minute: 15 },
                includesPastActivity: false,
              },
            ]
          : [],
      );
      Device.userDefaultsSet(STATE, { mode, endsAt });
      if (mode === "focus") Device.blockSelection(selection);
      setStatus(
        mode === "focus"
          ? "Bloqueo solicitado a iOS. Abre una app seleccionada para comprobarlo."
          : "Observación local activa durante una hora. No cambia el acceso a tus apps.",
      );
    } catch (e) {
      Device.unblockSelection(selection);
      Device.stopMonitoring([ACTIVITY]);
      Device.userDefaultsRemove(STATE);
      throw e;
    }
  }
  function end() {
    Device.stopMonitoring([ACTIVITY]);
    Device.unblockSelection(selection);
    Device.cleanUpAfterActivity(ACTIVITY);
    Device.userDefaultsRemove(STATE);
    setStatus("Finalizaste la sesión. Se retiró el bloqueo de SOL.");
  }
  return (
    <Card>
      <Text style={styles.eyebrow}>
        EXPERIMENTO NATIVO · SOLO EN ESTE IPHONE
      </Text>
      <Text style={styles.h2}>Tu tiempo, con intención.</Text>
      <Text style={styles.muted}>
        Elige apps de ocio. Deja disponibles el teléfono, las alertas de guardia
        y SOL. Puedes terminar la pausa aquí.
      </Text>
      {!authorized ? (
        <Button
          title="Permitir acceso a Screen Time"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await Device.requestAuthorization("individual");
              await Device.pollAuthorizationStatus();
            })
          }
        />
      ) : (
        <>
          <Button
            secondary
            title={selected ? "Cambiar apps seleccionadas" : "Elegir apps"}
            disabled={busy || !!session}
            onPress={() => setPicker(true)}
          />
          <View style={styles.wrap}>
            {[15, 30, 60].map((value) => (
              <Chip
                key={value}
                title={`${value} min`}
                selected={minutes === value}
                disabled={busy || !!session}
                onPress={() => setMinutes(value)}
              />
            ))}
          </View>
          {session ? (
            <>
              <Text style={styles.text}>
                {session.mode === "focus" ? "Pausa" : "Observación"} hasta las{" "}
                {new Date(session.endsAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </Text>
              <Button
                title="Finalizar ahora"
                disabled={busy}
                onPress={() => void run(async () => end())}
              />
            </>
          ) : (
            <>
              <Button
                title={`Pausar apps ${minutes} min`}
                disabled={!selected || busy}
                onPress={() => void run(() => start("focus"))}
              />
              <Button
                secondary
                title="Observar 1 hora, sin bloquear"
                disabled={!selected || busy}
                onPress={() => void run(() => start("observe"))}
              />
            </>
          )}
        </>
      )}
      {!!status && <Text style={styles.small}>{status}</Text>}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.text}>
          {error}
        </Text>
      )}
      {events.some(
        (event) =>
          event.callbackName === "eventDidReachThreshold" &&
          session &&
          event.lastCalledAt.getTime() >= Date.parse(session.endsAt) - 3600000,
      ) && (
        <Text style={styles.muted}>
          iOS informó el umbral de 15 minutos en tu selección. Es una señal
          local; SOL no deduce por qué la usaste.
        </Text>
      )}
      <Text style={styles.small}>
        No se envían nombres de apps, selecciones ni eventos de uso al servidor.
        El experimento necesita validación en tu dispositivo; los callbacks
        dependen de iOS.
      </Text>
      <Button
        secondary
        title="Actualizar estado del iPhone"
        disabled={busy}
        onPress={refresh}
      />
      <Modal
        visible={picker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPicker(false);
          refresh();
        }}
      >
        <SafeAreaView style={styles.shell}>
          <View style={[styles.page, { paddingBottom: 8 }]}>
            <Text style={styles.h2}>Elige tus distracciones</Text>
            <Text style={styles.small}>
              La selección se guarda solo en este iPhone.
            </Text>
          </View>
          <Device.DeviceActivitySelectionViewPersisted
            familyActivitySelectionId={SELECTION}
            style={{ flex: 1 }}
          />
          <View style={styles.page}>
            <Button
              title="Guardar selección"
              onPress={() => {
                setPicker(false);
                refresh();
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </Card>
  );
}
