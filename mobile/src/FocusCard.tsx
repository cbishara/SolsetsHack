import React from "react";
import { Platform, Text } from "react-native";
import { requireOptionalNativeModule } from "expo";
import Constants from "expo-constants";
import { Card, styles } from "./ui";

export default function FocusCard() {
  const available =
    Platform.OS === "ios" &&
    Constants.expoConfig?.extra?.screenTimeEnabled === true &&
    !!requireOptionalNativeModule("ReactNativeDeviceActivity");
  if (!available)
    return (
      <Card>
        <Text style={styles.eyebrow}>EXPERIMENTO · TIEMPO PARA TI</Text>
        <Text style={styles.h2}>Una pausa de las distracciones.</Text>
        <Text style={styles.muted}>
          Elige qué apps quieres pausar y por cuánto tiempo. Tu selección y su
          actividad permanecen en el iPhone.
        </Text>
        <Text style={styles.small}>
          {Platform.OS === "ios"
            ? "El bloqueo no está disponible en Expo Go. Necesita instalar la build de SOL con Screen Time."
            : "El experimento de bloqueo está preparado para iPhone. Esta versión no bloquea apps en Android ni en web."}
        </Text>
      </Card>
    );
  // Loading the native views eagerly would break Expo Go, which lacks this module.
  const NativeFocus = require("./NativeFocus").default;
  return <NativeFocus />;
}
