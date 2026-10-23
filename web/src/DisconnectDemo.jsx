import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Send, MessageCircle, Moon, Brain, Pause, Play, Check, ChevronDown } from 'lucide-react';
import './disconnect.css';

const deliveryLabels = {
  simulated: 'Prueba web · sin envío', accepted: 'Aceptada por API · entrega sin confirmar',
  unknown: 'Envío sin confirmar · revisar Kapso', pending: 'Preparada · envío pendiente',
  shadow: 'Modo sombra · sin enviar', paused: 'En pausa · sin enviar',
  'not-authorized': 'Sin permiso para enviar', expired: 'Ventana vencida o sin comprobar · escribe de nuevo',
};
const blockerLabels = { clarity: 'No sé por dónde empezar', overload: 'Demasiados pendientes', distraction: 'Me voy a las redes' };
async function request(path, body, method = 'POST') {
  const response = await fetch(path, {
    ...(body === undefined ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(response.status === 401 ? 'Inicia sesión con el acceso del equipo para abrir esta demo.' : 'No pude conectar con SOL. Tu texto sigue aquí.');
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'No se pudo completar el paso.');
  return value;
}

export default function DisconnectDemo() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState('demo:web');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showConnection, setShowConnection] = useState(false);
  const inFlight = useRef(false), retry = useRef(null), thread = useRef(null);
  const session = data?.sessions.find(item => item.id === selected);
  const web = selected === 'demo:web', settings = data?.settings, connection = data?.connection;
  async function refresh() { const next = await request('/api/disconnect'); setData(next); return next; }
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const next = await request('/api/disconnect'); if (active) setData(next); }
      catch (e) { if (active) setError(e.message); }
    };
    load();
    const timer = setInterval(load, 4000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; }, [selected, session?.messages.length]);
  async function send(text) {
    if (inFlight.current || !text.trim() || !web) return;
    inFlight.current = true; setBusy(true); setError('');
    const pending = retry.current?.text === text.trim() ? retry.current : { text: text.trim(), requestId: crypto.randomUUID() };
    retry.current = pending;
    try {
      const result = await request('/api/disconnect/messages', pending);
      setData(previous => ({ ...previous, sessions: [result.session, ...(previous?.sessions || []).filter(item => item.id !== result.session.id)] }));
      retry.current = null; setInput('');
    } catch (e) { setInput(text); setError(e.message + ' Puedes reintentar sin duplicar este paso.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function changeSettings(changes) {
    if (inFlight.current || !settings) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await request('/api/settings', { ...settings, ...changes }, 'PATCH'); await refresh(); }
    catch (e) { setError(e.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const quickReplies = !session?.concern
    ? ['Terminé mi turno y sigo pensando en el registro de la VPN.', 'Quiero desconectar, pero dejo pendiente el informe y me voy a las redes.']
    : session.phase === 'blocker' ? ['1', '2', '3'] : ['ME AYUDÓ', 'MÁS PEQUEÑO', 'CAMBIAR', 'RESUMEN', 'NUEVO'];
  return <div className="dc-page">
    <header className="dc-header"><a href="/" className="dc-brand">solsets ↗</a><span>Un pendiente menos en tu cabeza.</span><a href="/app">Panel anterior ↗</a></header>
    <main className="dc-main">
      <section className="dc-intro"><div><span className="dc-eyebrow">SOL · DEMO DE DESCONEXIÓN</span><h1>Déjalo encaminado.<br/><em>Vuelve a tu vida.</em></h1><p>Cuéntame qué te impide desconectar. Preparamos un paso pequeño y ajustamos la ayuda contigo.</p></div><div className="dc-intro-note"><Moon size={28}/><p>Ejemplos ficticios.<br/>La prueba web no envía mensajes.</p></div></section>
      {error && <div className="dc-error" role="alert">{error}<button onClick={async () => { try { await refresh(); setError(''); } catch (e) { setError(e.message); } }}>Reintentar conexión</button></div>}
      <div className="dc-layout">
        <section className="dc-chat" aria-label="Conversación con SOL">
          <div className="dc-chat-heading"><span className="dc-avatar">↗</span><div><h2>Vamos de a una cosa.</h2><p>{web ? 'Prueba el mismo recorrido de WhatsApp' : 'WhatsApp · vista de lectura'}</p></div></div>
          <label className="dc-session-label" htmlFor="dc-session">Conversación</label><select id="dc-session" value={selected} onChange={event => setSelected(event.target.value)} disabled={busy}>
            <option value="demo:web">Prueba web · datos ficticios</option>{data?.sessions.filter(item => item.id !== 'demo:web').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <div className="dc-thread" ref={thread} role="log" aria-live="polite" aria-label="Mensajes">
            {!session?.messages.length && <div className="dc-message assistant"><span>SOL</span><p>¿Qué pendiente tienes dando vueltas hoy? Usa un ejemplo ficticio. Lo que confirmes queda guardado para retomar esta demo.</p></div>}
            {session?.messages.map(message => <div key={message.id} className={'dc-message ' + message.role}><span>{message.role === 'user' ? 'Tú' : 'SOL'}</span><p>{message.text}</p>{message.delivery && <small>{deliveryLabels[message.delivery] || 'Estado por comprobar'}</small>}</div>)}
          </div>
          {web ? <><div className="dc-quick" aria-label="Respuestas sugeridas">{quickReplies.map(text => <button disabled={busy || !data} key={text} onClick={() => send(text)}>{text}</button>)}</div>
            <form className="dc-composer" onSubmit={event => { event.preventDefault(); send(input); }}><label htmlFor="dc-input">Tu mensaje</label><div><textarea id="dc-input" rows={2} maxLength={2000} value={input} onChange={event => setInput(event.target.value)} placeholder="Cuéntame un pendiente ficticio…" disabled={busy}/><button type="submit" disabled={busy || !data || !input.trim()} aria-label="Enviar mensaje">{busy ? '…' : <Send size={19}/>}</button></div></form>
            <p className="dc-storage">Guardado en el servidor de esta demo del equipo. Escribe BORRAR para eliminar contexto e historial de SOL.</p>
          </> : <p className="dc-storage">Continúa desde el teléfono que inició esta conversación. La prueba web tiene un contexto independiente.</p>}
        </section>
        <aside className="dc-context">
          <section className="dc-card"><span className="dc-eyebrow"><Brain size={16}/> LO QUE ME CONTASTE</span><h2>Tu contexto, a la vista.</h2><dl><dt>Lo que quieres dejar encaminado</dt><dd>{session?.concern || 'Lo conoceré con tu primer mensaje.'}</dd><dt>Qué te frena</dt><dd>{blockerLabels[session?.blocker] || 'Te lo preguntaré; no lo doy por hecho.'}</dd><dt>Cómo prefieres empezar</dt><dd>{session?.preference ? 'Pasos de 2 minutos · tú lo pediste' : 'Todavía no hay una preferencia confirmada.'}</dd></dl></section>
          <section className="dc-card dc-plan"><span className="dc-eyebrow"><Check size={16}/> {session?.plan ? 'PREPARADO · PENDIENTE ABIERTO' : 'TU SIGUIENTE PASO'}</span><h2>{session?.plan?.title || 'Algo pequeño que sí puedas hacer.'}</h2><p>{session?.plan?.nextStep || 'La ayuda cambia según el obstáculo que elijas.'}</p>{session?.plan && <><blockquote>{session.plan.prepared}</blockquote><small>{session.plan.basis}</small></>}{session?.feedback.length > 0 && <p className="dc-feedback">Guardamos tu respuesta: esta ayuda te sirvió. No es una medición de descanso ni confirma que el pendiente terminó.</p>}</section>
          <section className="dc-card dc-whatsapp"><span className="dc-eyebrow"><MessageCircle size={16}/> CONTINÚA POR WHATSAPP</span><h2>{connection?.configured ? 'Conexión por comprobar.' : 'Preparado para conectar.'}</h2><p>{connection?.configured ? 'Escribe primero al número de prueba. Aquí aparecerán la conversación y el resultado de cada respuesta.' : 'El equipo debe conectar el número de prueba de Kapso. Mientras tanto, puedes recorrer la demo aquí.'}</p>{connection?.chatUrl && <a className="dc-primary" href={connection.chatUrl} target="_blank" rel="noreferrer">Abrir WhatsApp <ArrowUpRight size={18}/></a>}
            {connection && <div className="dc-evidence"><span>{connection.receivedCount} mensajes recibidos</span><span>{connection.acceptedCount} respuestas aceptadas por API</span><span>{connection.queuedCount} en cola</span></div>}
            <button className="dc-config-toggle" aria-expanded={showConnection} onClick={() => setShowConnection(!showConnection)}>Conexión y controles del equipo <ChevronDown size={16}/></button>
            {showConnection && <div className="dc-config"><p>Estado: {settings?.paused ? 'Pausado' : settings?.shadow ? 'Modo sombra: prepara sin enviar' : settings?.permissions.reply === 'auto' ? 'Respuestas habilitadas' : 'Sin autorización para responder'}.</p>
              {connection?.missing.length > 0 && <><strong>Variables pendientes</strong><ul>{connection.missing.map(key => <li key={key}><code>{key}</code></li>)}</ul></>}
              <label htmlFor="dc-webhook">Webhook Kapso</label><input id="dc-webhook" readOnly value={connection?.webhookUrl || ''}/>
              <small>Evento whatsapp.message.received · HMAC · sin buffering. Solo texto de números permitidos. La demo guiada no necesita Hermes.</small>
              <div className="dc-controls"><button disabled={busy || !settings || !connection?.configured} onClick={() => changeSettings({ paused: false, shadow: false, permissions: { ...settings.permissions, reply: 'auto' } })}><Play size={15}/> Habilitar respuestas</button><button disabled={busy || !settings} onClick={() => changeSettings({ paused: !settings.paused })}><Pause size={15}/>{settings?.paused ? 'Reanudar' : 'Pausar'}</button><button disabled={busy || !settings} onClick={() => changeSettings({ shadow: true })}>Modo sombra</button></div>
              <small>Al reanudar se procesa la cola. Las propuestas hechas en sombra no se envían después; escribe otro mensaje. Una respuesta aceptada no confirma entrega.</small>
            </div>}
          </section>
        </aside>
      </div>
      <footer className="dc-footer"><span>SOL aprende de tus correcciones.</span><span>Demo guiada · sin monitorización del teléfono ni bloqueo de apps.</span></footer>
    </main>
  </div>;
}
