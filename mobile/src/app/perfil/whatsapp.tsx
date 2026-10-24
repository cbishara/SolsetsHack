import { router } from 'expo-router';
import { Check, ExternalLink, FileText, Link2, MessageCircle, Mic, RefreshCw, ShieldCheck, Smartphone, Unplug, Users } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useBackend } from '../../api/backend';
import { CodeInput } from '../../components/code-input';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Avatar, Badge, Button, Glass, IconTile, List, ListRow, Screen, Section, T, tap, ToggleRow } from '../../components/ui';
import { relative } from '../../data/dates';
import { useStore } from '../../data/store';
import { confirm } from '../../features/settings/confirm';
import { createLinkClient, LinkError, linkErrorText } from '../../features/whatsapp/link';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

type Step = 'overview' | 'link' | 'code';
const GREEN = '#25D366';

/**
 * WhatsApp: link the person's own account, choose what Sol may read, and see
 * that the connection is alive. Works against server/'s multiuser routes; with
 * example data the same steps run as a demonstration and say so.
 */
export default function WhatsApp() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const backend = useBackend();
  const wa = state.connections.find((c) => c.id === 'whatsapp');
  const connected = wa?.status === 'connected';
  const paused = wa?.status === 'off' && !!wa?.account && state.chats.some((c) => c.on);
  const live = state.dataSource === 'server' && backend.status === 'connected';
  const client = useMemo(() => (live ? createLinkClient(backend.url) : null), [live, backend.url]);

  const [step, setStep] = useState<Step>('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const watched = state.chats.filter((c) => c.on);
  const sum = state.summaries;
  const viaWa = sum.morning.channels.includes('whatsapp') || sum.evening.channels.includes('whatsapp');
  const linked = connected || paused;

  const finish = () => {
    tap('success');
    dispatch({ type: 'setConnection', id: 'whatsapp', patch: { status: 'connected', detail: 'Vinculado', lastCheck: new Date().toISOString(), account: wa?.account ?? 'Tu WhatsApp' } });
    setStep('overview');
    setCode('');
    router.push('/perfil/whatsapp-chats');
  };

  const start = async () => {
    setError(null);
    setStep('link');
    if (!client) return; // demonstration: the link step explains and continues by hand
    setBusy(true);
    try {
      await client.ensureSession();
      const c = await client.start();
      setConnectionId(c.connectionId);
      if (await Linking.canOpenURL(c.url).catch(() => false)) void Linking.openURL(c.url);
      setWaiting(true);
      poll.current = setInterval(async () => {
        try {
          const st = await client.status(c.connectionId);
          if (st.status === 'awaiting_code') { setWaiting(false); setStep('code'); if (poll.current) clearInterval(poll.current); }
          if (st.status === 'verified') { if (poll.current) clearInterval(poll.current); finish(); }
        } catch { /* keep waiting */ }
      }, 3000);
    } catch (e) {
      setError(linkErrorText(e));
      if (e instanceof LinkError && (e.status === 404 || e.code === 'not_found')) setStep('overview');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setError(null);
    if (!client || !connectionId) { finish(); return; }
    setBusy(true);
    try {
      await client.verify(connectionId, value);
      finish();
    } catch (e) {
      setError(linkErrorText(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => confirm('Dejar de usar WhatsApp', 'Sol deja de leer tus chats. Tu cuenta de WhatsApp no se toca.', async () => {
    try { await client?.disconnect(); } catch { /* the local state still changes */ }
    dispatch({ type: 'setConnection', id: 'whatsapp', patch: { status: 'off', detail: 'Sin conectar', account: undefined } });
    dispatch({ type: 'setChats', chats: state.chats.map((c) => ({ ...c, on: false })) });
  }, 'Desconectar');

  return (
    <Screen padBottom={false}>
      <Header title="WhatsApp" />

      <Glass style={s.status}>
        <View style={s.statusHead}>
          <IconTile icon={MessageCircle} color={GREEN} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3">{connected ? 'Conectado' : paused ? 'En pausa' : 'Sin conectar'}</T>
            <T v="callout" tone="muted" numberOfLines={1}>
              {connected ? `${wa?.account ?? 'Tu WhatsApp'} · revisado ${relative(wa?.lastCheck ?? new Date().toISOString())}` : paused ? 'Sol no está leyendo mensajes nuevos' : 'Sol todavía no lee tus chats'}
            </T>
          </View>
          {connected ? <Badge label={`${watched.length} chats`} tone="calm" /> : null}
        </View>
        {!live ? <T v="caption" tone="faint">{state.dataSource === 'example' ? 'Demostración con datos de ejemplo. Con "Servidor en vivo" se conecta de verdad.' : 'El servidor no responde: los cambios quedan en este teléfono.'}</T> : null}
      </Glass>

      {error ? (
        <View style={[s.error, { backgroundColor: p.urgentSoft }]}>
          <T v="callout" tone="urgent" style={{ flex: 1 }}>{error}</T>
        </View>
      ) : null}

      {!linked && step === 'overview' ? (
        <>
          <Section title="Cómo funciona">
            <List>
              <ListRow icon={Link2} iconColor={GREEN} title="1. Vincula tu WhatsApp" detail="Como WhatsApp Web: escaneas un código desde tu teléfono." />
              <ListRow icon={ShieldCheck} iconColor={p.sol} title="2. Confirma con un código" detail="El WhatsApp de Sol te manda 6 dígitos para comprobar que la cuenta es tuya." />
              <ListRow icon={Users} iconColor={categoryColors.blue} title="3. Elige qué chats lee Sol" detail="Sol te sugiere los que parecen importantes. Tú decides: todo empieza sin marcar." last />
            </List>
          </Section>
          <Button kind="primary" label="Conectar WhatsApp" icon={MessageCircle} onPress={() => void start()} disabled={busy} />
          <T v="caption" tone="faint" style={{ textAlign: 'center' }}>Sol solo lee los chats que elijas. No responde a nadie por ti ni escribe en tus grupos.</T>
        </>
      ) : null}

      {step === 'link' ? (
        <Glass style={s.flow}>
          <T v="captionStrong" tone="sol">Paso 1 de 3</T>
          <T v="h3">Vincula tu WhatsApp</T>
          <View style={{ gap: space.sm }}>
            {['Abre WhatsApp en tu teléfono.', 'Ve a Configuración y luego a Dispositivos vinculados.', 'Toca Vincular un dispositivo y escanea el código del enlace.'].map((t, i) => (
              <View key={t} style={s.inline}>
                <View style={[s.num, { backgroundColor: p.surface }]}><T v="captionStrong">{i + 1}</T></View>
                <T v="callout" style={{ flex: 1 }}>{t}</T>
              </View>
            ))}
          </View>
          {busy || waiting ? (
            <View style={s.inline}><ActivityIndicator color={p.sol} /><T v="callout" tone="muted">{busy ? 'Preparando el enlace…' : 'Esperando que escanees el código…'}</T></View>
          ) : null}
          {!client ? (
            <Button kind="sol" label="Ya lo vinculé" onPress={() => { tap(); setStep('code'); }} />
          ) : !busy && !waiting ? (
            <Button kind="secondary" label="Abrir el enlace otra vez" icon={ExternalLink} onPress={() => void start()} />
          ) : null}
          <Button kind="ghost" label="Cancelar" onPress={() => { if (poll.current) clearInterval(poll.current); setWaiting(false); setStep('overview'); }} />
        </Glass>
      ) : null}

      {step === 'code' ? (
        <Glass style={s.flow}>
          <T v="captionStrong" tone="sol">Paso 2 de 3</T>
          <View style={s.inline}>
            <SolOrb size={18} state="watching" style={{ margin: -8 }} />
            <T v="h3" style={{ flex: 1 }}>Escribe el código que te mandó Sol</T>
          </View>
          <T v="callout" tone="muted">Te llegó un WhatsApp de Sol con 6 dígitos. Así comprobamos que la cuenta es tuya.</T>
          <CodeInput value={code} onChange={setCode} error={!!error} onDone={(v) => void verify(v)} />
          {!client ? <T v="caption" tone="faint" style={{ textAlign: 'center' }}>En la demostración sirve cualquier código de 6 dígitos.</T> : null}
          <Button kind="sol" label={busy ? 'Comprobando…' : 'Confirmar'} disabled={code.length !== 6 || busy} onPress={() => void verify()} />
          <Pressable accessibilityRole="button" onPress={() => { tap(); setError(null); if (client && connectionId) client.resend(connectionId).catch((e) => setError(linkErrorText(e))); }} style={{ alignSelf: 'center' }} hitSlop={10}>
            <T v="calloutStrong" tone="muted">Mandarme otro código</T>
          </Pressable>
        </Glass>
      ) : null}

      {linked ? (
        <>
          <Section title="Chats que lee Sol" count={watched.length} action="Elegir chats" onAction={() => router.push('/perfil/whatsapp-chats')}>
            <List>
              {watched.slice(0, 6).map((c, i) => (
                <ListRow key={c.id} title={c.name} detail={c.reason ?? (c.kind === 'grupo' ? `Grupo${c.members ? ` · ${c.members} personas` : ''}` : 'Chat personal')}
                  leading={c.kind === 'grupo' ? <IconTile icon={Users} color={GREEN} size={34} /> : <Avatar name={c.name} size={34} />}
                  right={<Check size={18} color={p.calm} />} last={i === Math.min(watched.length, 6) - 1} />
              ))}
              {!watched.length ? <ListRow title="Ningún chat elegido" detail="Sol no lee nada hasta que elijas" onPress={() => router.push('/perfil/whatsapp-chats')} last /> : null}
            </List>
            <T v="caption" tone="faint">Solo entra lo que llega a estos chats. Los demás ni se abren.</T>
          </Section>

          <Section title="Sol en WhatsApp">
            <Glass style={s.contact}>
              <View style={[s.botAvatar, { backgroundColor: '#000' }]}><SolOrb size={22} state="watching" /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">Sol</T>
                <T v="callout" tone="muted">Tu asistente, en un número propio</T>
              </View>
              {Platform.OS !== 'web' ? <Button small kind="secondary" label="Escribirle" onPress={() => void Linking.openURL('whatsapp://')} /> : null}
            </Glass>
            <List>
              <ListRow icon={FileText} iconColor={p.sol} title="Resúmenes por WhatsApp" value={viaWa ? 'Activados' : 'Apagados'} onPress={() => router.push('/perfil/resumenes')} />
              <ListRow icon={Mic} iconColor={categoryColors.green} title="Mándale audios o textos" detail='"Mañana llamar al proveedor y el viernes pagar la luz": lo anota con fecha y te confirma.' />
              <ListRow icon={Smartphone} iconColor={categoryColors.blue} title="Es la misma conversación que en la app" detail="Lo que le dices por WhatsApp aparece en el chat con Sol, y al revés." last />
            </List>
            <Button kind="secondary" label="Ver cómo llegan los mensajes" icon={MessageCircle} onPress={() => router.push('/resumen/whatsapp')} />
          </Section>

          <Section title="Conexión">
            <List>
              <ToggleRow title="Leer mensajes nuevos" detail={connected ? 'Si lo apagas, Sol pausa WhatsApp sin desvincularlo' : 'En pausa: Sol no lee mensajes nuevos'} value={connected}
                onChange={(on) => dispatch({ type: 'setConnection', id: 'whatsapp', patch: { status: on ? 'connected' : 'off' } })} />
              <ListRow icon={RefreshCw} iconTone="muted" title="Revisar conexión" detail={`Última revisión ${relative(wa?.lastCheck ?? new Date().toISOString())}`}
                onPress={() => { tap('success'); dispatch({ type: 'setConnection', id: 'whatsapp', patch: { lastCheck: new Date().toISOString() } }); void backend.refresh(); }} />
              <ListRow icon={Unplug} iconTone="urgent" titleTone="urgent" title="Dejar de usar WhatsApp" onPress={disconnect} last />
            </List>
          </Section>
        </>
      ) : null}
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  status: { padding: space.xl, gap: space.md, borderRadius: radius.xl },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  error: { borderRadius: radius.md, padding: space.md, marginTop: -space.lg },
  flow: { padding: space.xl, gap: space.lg, borderRadius: radius.xl },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  botAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
