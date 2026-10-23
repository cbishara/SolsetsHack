import { CircleAlert, CircleCheck, CloudOff, RefreshCw, Send, Server } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { defaultServerUrl, useBackend } from '../../api/backend';
import { Badge, Button, Card, Chip, Section, T } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

const FROM_SERVER = ['La guardia de esta noche', 'Lo que pasó anoche y el resumen', 'Tu feedback', 'Modo prueba o real', 'Estado de WhatsApp y correo'];
const STILL_LOCAL = ['Tareas y agenda', 'Reglas, memoria y entrenamiento', 'Sueño estimado'];

/** "Is this real?" in one card: where the data comes from, and how to connect server/. */
export function ServerCard() {
  const { p } = useTheme();
  const b = useBackend();
  const [url, setUrl] = useState(b.url || defaultServerUrl());
  const [token, setToken] = useState('');
  const [test, setTest] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const connected = b.status === 'connected';
  const Icon = connected ? CircleCheck : b.status === 'error' ? CircleAlert : CloudOff;
  const tone = connected ? 'calm' : b.status === 'error' ? 'urgent' : 'muted';

  return (
    <Section eyebrow="Servidor de Sol" title={connected ? 'Conectado' : b.status === 'connecting' ? 'Conectando…' : 'Usando datos de ejemplo'}>
      <Card>
        <View style={s.head}>
          {b.status === 'connecting' ? <ActivityIndicator color={p.accent} /> : <Icon size={22} color={p[tone]} strokeWidth={2.2} />}
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodyStrong">{connected ? 'Sol está conectado al servidor' : b.status === 'error' ? 'No pude conectarme' : 'Sin servidor'}</T>
            <T v="callout" tone="muted" numberOfLines={2}>
              {connected
                ? `${b.url.replace(/^https?:\/\//, '')}${b.lastSync ? ` · actualizado ${new Date(b.lastSync).toTimeString().slice(0, 5)}` : ''}`
                : b.status === 'error' ? b.error ?? 'El servidor no respondió.' : 'La app muestra datos de ejemplo de Rodrigo.'}
            </T>
          </View>
          {connected ? <Badge label={b.whatsappLive ? 'WhatsApp en vivo' : 'WhatsApp sin conectar'} tone={b.whatsappLive ? 'calm' : 'neutral'} /> : null}
        </View>

        {connected ? (
          <View style={{ gap: space.sm }}>
            <T v="calloutStrong">Viene del servidor</T>
            {FROM_SERVER.map((x) => <T key={x} v="callout" tone="muted">· {x}</T>)}
            <T v="calloutStrong" style={{ marginTop: space.sm }}>Todavía local, mientras el servidor lo suma</T>
            {STILL_LOCAL.map((x) => <T key={x} v="callout" tone="muted">· {x}</T>)}
            {b.metrics ? (
              <T v="caption" tone="faint" style={{ marginTop: space.sm }}>
                El servidor lleva {b.metrics.nights} {b.metrics.nights === 1 ? 'noche' : 'noches'}, {b.metrics.wakes} alertas y {b.metrics.rated} decisiones marcadas por ti.
              </T>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            <T v="caption" tone="muted">Dirección del servidor</T>
            <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url"
              style={[s.input, { color: p.ink, borderColor: p.line, backgroundColor: p.surface }]} accessibilityLabel="Dirección del servidor" />
            <T v="caption" tone="muted">Token (solo si el servidor lo pide; en desarrollo lo pone el Mac)</T>
            <TextInput value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} secureTextEntry
              style={[s.input, { color: p.ink, borderColor: p.line, backgroundColor: p.surface }]} accessibilityLabel="Token del servidor" placeholder="Opcional" placeholderTextColor={p.faint} />
          </View>
        )}

        <View style={s.actions}>
          {connected ? (
            <>
              <Chip label="Actualizar" icon={RefreshCw} onPress={() => void run(b.refresh)} />
              <Chip label="Desconectar" onPress={b.disconnect} />
            </>
          ) : (
            <Button label={b.status === 'error' ? 'Reintentar' : 'Conectar'} icon={Server} onPress={() => void run(() => b.connect(url.trim(), token.trim() || undefined))} disabled={busy} style={{ flex: 1 }} />
          )}
        </View>
      </Card>

      {connected ? (
        <Card tone="surface">
          <T v="bodyStrong">Probar el recorrido</T>
          <T v="callout" tone="muted">Manda un aviso inventado como si llegara al grupo de guardia y mira cómo lo decide Sol en el resumen.</T>
          <TextInput value={test} onChangeText={setTest} placeholder="Ej: se cayó el portal de clientes" placeholderTextColor={p.faint}
            style={[s.input, { color: p.ink, borderColor: p.line, backgroundColor: p.card }]} accessibilityLabel="Aviso de prueba" />
          <View style={s.actions}>
            <Button label="Enviar aviso" icon={Send} kind="secondary" disabled={!test.trim() || busy} onPress={() => void run(async () => { await b.sendTestMessage(test.trim()); setTest(''); })} style={{ flex: 1 }} />
            <Button label="Simular una noche" kind="ghost" disabled={busy} onPress={() => void run(b.simulateNight)} />
          </View>
          <T v="caption" tone="faint">Datos sintéticos. Nada se envía a WhatsApp ni a nadie.</T>
        </Card>
      ) : null}
    </Section>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, minHeight: 48, fontFamily: 'InterTight_400Regular', fontSize: 16 },
  actions: { flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' },
});
