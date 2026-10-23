import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronUp, Copy, FileText, HelpCircle, Pause, Pencil, Play, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { PERSONAS, DEMO_EVENT, normalizePersona, readDemoState, writeDemoState, demoStateIsPersistent, buildDraft, updateDraft, updateMemory, draftAsText, needsFirstConcern } from './personalization.mjs';
import './sol-assistant.css';

export function useDemoWorkspace(persona = 'rodrigo', onTasksChange) {
  const normalized = normalizePersona(persona);
  const [state, setState] = useState(() => readDemoState(normalized));
  const [persistent, setPersistent] = useState(() => demoStateIsPersistent(normalized));
  const stateRef = useRef(state);
  const callbackRef = useRef(onTasksChange);
  callbackRef.current = onTasksChange;
  useEffect(() => {
    const synchronize = event => {
      if (event?.detail?.persona && event.detail.persona !== normalized) return;
      const next = readDemoState(normalized);
      stateRef.current = next;
      setState(next);
      setPersistent(demoStateIsPersistent(normalized));
    };
    synchronize();
    window.addEventListener(DEMO_EVENT, synchronize);
    window.addEventListener('storage', synchronize);
    return () => { window.removeEventListener(DEMO_EVENT, synchronize); window.removeEventListener('storage', synchronize); };
  }, [normalized]);
  useEffect(() => { callbackRef.current?.(state.drafts); }, [state.drafts]);
  const update = useCallback(change => {
    const next = typeof change === 'function' ? change(stateRef.current) : change;
    stateRef.current = next;
    setState(next);
    setPersistent(writeDemoState(next));
    return next;
  }, []);
  return { state, update, persistent };
}

function MemoryContent({ state, update, persistent }) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');
  const [notice, setNotice] = useState('');
  function edit(key) { setEditing(key); setValue(state.memories.find(m => m.key === key)?.value || (key === 'format' ? 'Breve y directo' : '')); setNotice(''); }
  function save(event) {
    event.preventDefault();
    update(previous => updateMemory(previous, editing, value));
    setNotice(editing === 'reviewTime' ? 'Actualicé la revisión propuesta en tus borradores. No se ha programado ningún aviso.' : 'Usaré esta preferencia para los próximos borradores.');
    setEditing(null);
  }
  return <div className="sol-memory-content">
    <div className="sol-memory-intro"><span className="sol-kicker">CONTEXTO QUE TÚ CONTROLAS</span><h3>Lo que recuerdo de ti.</h3><p>Solo lo que eliges guardar para este ejemplo. Puedes corregirlo o eliminarlo cuando quieras.</p></div>
    <div className="sol-memory-list">{[
      { key: 'format', name: 'Cómo prefieres las respuestas', fallback: 'Aún no has elegido un formato.' },
      { key: 'reviewTime', name: 'Cuándo revisar este escenario', fallback: 'Sin horario propuesto.' },
    ].map(item => {
      const memory = state.memories.find(m => m.key === item.key);
      return <div className="sol-memory-row" key={item.key}>
        <div><strong>{item.name}</strong><p>{memory?.value || item.fallback}</p>{memory && <small>{memory.source} · {new Date(memory.updatedAt).toLocaleDateString('es-CL')}</small>}</div>
        <div className="sol-memory-actions"><button type="button" className="sol-icon-btn" aria-label={`Corregir ${item.name.toLowerCase()}`} onClick={() => edit(item.key)}><Pencil size={16}/></button>{memory && <button type="button" className="sol-icon-btn" aria-label={`Eliminar ${item.name.toLowerCase()}`} onClick={() => { update(previous => updateMemory(previous, item.key, '')); setNotice('Dato eliminado del contexto y de las revisiones propuestas.'); }}><Trash2 size={16}/></button>}</div>
      </div>;
    })}</div>
    {editing && <form className="sol-memory-editor" onSubmit={save}>
      <label htmlFor={`sol-memory-${editing}`}>{editing === 'format' ? 'Elige un formato' : 'Horario o momento, solo para este escenario'}</label>
      {editing === 'format' ? <select id={`sol-memory-${editing}`} value={value} onChange={e => setValue(e.target.value)}><option>Breve y directo</option><option>Con más detalle</option></select> : <input id={`sol-memory-${editing}`} autoFocus value={value} onChange={e => setValue(e.target.value)} placeholder="Ej.: hoy, al terminar mi turno a las 08:00" maxLength={160} required/>}
      <div className="sol-action-row"><button className="sol-btn sol-btn-blue" type="submit"><Check size={16}/> Guardar preferencia</button><button className="sol-btn sol-btn-text" type="button" onClick={() => setEditing(null)}>Cancelar</button></div>
    </form>}
    {notice && <p className="sol-notice" role="status">{notice}</p>}
    <p className="sol-fineprint">{persistent ? 'Contexto de demostración guardado solo en este navegador.' : 'No se pudo guardar en este navegador. Los cambios se mantienen mientras sigas en esta página, incluso al cambiar de sección. Se perderán al recargar o cerrar.'} Estas preferencias no conceden permisos para actuar.</p>
  </div>;
}

export function MemoryPanel({ persona = 'rodrigo', onTasksChange }) {
  const workspace = useDemoWorkspace(persona, onTasksChange);
  return <section className="sol-assistant sol-memory-panel"><MemoryContent {...workspace}/></section>;
}

export default function SolAssistant({ initialPrompt = '', persona = 'rodrigo', onTasksChange, onPromptConsumed }) {
  const { state, update, persistent } = useDemoWorkspace(persona, onTasksChange);
  const normalized = normalizePersona(persona);
  const profile = PERSONAS[normalized];
  const [showMemory, setShowMemory] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const consumedPrompt = useRef('');
  const consumeCallback = useRef(onPromptConsumed);
  consumeCallback.current = onPromptConsumed;
  const inputRef = useRef(null);
  const headingRef = useRef(null);
  const draft = state.drafts.find(item => item.id === state.activeDraftId);

  useEffect(() => {
    const promptKey = `${normalized}:${initialPrompt}`;
    if (!initialPrompt.trim() || consumedPrompt.current === promptKey) return;
    consumedPrompt.current = promptKey;
    const latest = readDemoState(normalized);
    if (needsFirstConcern(initialPrompt)) {
      update({ ...latest, phase: 'compose', uncertainStart: true, activeDraftId: null, input: '' });
      consumeCallback.current?.();
      return;
    }
    const existing = latest.drafts.find(item => item.concern === initialPrompt.trim());
    const prepared = existing || buildDraft(initialPrompt, normalized, latest.memories);
    update({ ...latest, input: '', activeDraftId: prepared.id, phase: 'review', drafts: existing ? latest.drafts : [prepared, ...latest.drafts] });
    consumeCallback.current?.();
  }, [initialPrompt, normalized, update]);

  useEffect(() => { setNotice(''); setEditing(false); setShowMemory(false); }, [normalized]);
  useEffect(() => { if (state.phase === 'review') headingRef.current?.focus({ preventScroll: true }); }, [state.phase, state.activeDraftId]);

  function prepare(event) {
    event?.preventDefault();
    if (!state.input.trim()) { inputRef.current?.focus(); return; }
    if (needsFirstConcern(state.input)) {
      update(previous => ({ ...previous, phase: 'compose', uncertainStart: true, activeDraftId: null, input: '' }));
      inputRef.current?.focus();
      return;
    }
    const prepared = buildDraft(state.input, normalized, state.memories);
    update(previous => ({ ...previous, phase: 'review', uncertainStart: false, activeDraftId: prepared.id, input: '', drafts: [prepared, ...previous.drafts].slice(0, 50) }));
    setNotice(''); setEditing(false); setCopied(false);
  }

  function newConcern() {
    update(previous => ({ ...previous, phase: 'compose', activeDraftId: null, uncertainStart: false }));
    setNotice(''); setEditing(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function saveDraft() {
    if (!draft.title.trim() || !draft.description.trim() || !draft.nextStep.trim()) { setNotice('Completa el título, el contexto y el próximo paso para conservar un borrador útil.'); return; }
    update(previous => ({ ...updateDraft(previous, draft.id, { savedAt: new Date().toISOString() }), phase: 'saved' }));
    setEditing(false); setNotice('');
  }

  async function copyDraft() {
    try { await navigator.clipboard.writeText(draftAsText(draft)); setCopied(true); setNotice('Borrador copiado. Puedes revisarlo y usarlo donde lo necesites.'); }
    catch { setNotice('El navegador no permitió copiar. Abre “Editar borrador” para seleccionar el texto.'); }
  }

  return <section className="sol-assistant" aria-label="Tu asistente SOL">
    <header className="sol-assistant-header"><div className="sol-assistant-identity"><span className="sol-symbol"><Sparkles size={23}/></span><div><strong>SOL<span>Tu asistente personal</span></strong></div></div><span className="sol-demo-tag">Demostración</span></header>
    <div className="sol-assistant-body">
      {state.phase === 'paused' ? <div className="sol-pause-view"><span className="sol-large-icon"><Pause size={28}/></span><span className="sol-kicker">A TU RITMO</span><h2>Lo retomamos cuando quieras.</h2><p>{draft ? 'Tu borrador sigue aquí. No necesitas volver a explicarlo.' : 'Tu espacio está en pausa. Vuelve cuando quieras continuar.'}</p><button className="sol-btn sol-btn-yellow" onClick={() => update(previous => ({ ...previous, phase: draft ? 'review' : 'compose' }))}><Play size={17}/> Retomar con SOL</button><p className="sol-fineprint">{persistent ? 'Contexto conservado en este navegador.' : 'Solo disponible durante esta sesión: el navegador no permitió guardar.'}</p></div> : state.phase === 'saved' && draft ? <div className="sol-saved-view">
        <span className="sol-large-icon"><CheckCheck size={30}/></span><span className="sol-kicker">UN PENDIENTE CON PRÓXIMO PASO</span><h2>{persistent ? 'Tu borrador tiene su lugar.' : 'Tu borrador está preparado.'}</h2><p>{persistent ? 'Puedes cerrar y volver después. Aquí queda el contexto para continuar.' : 'No se pudo guardar en este navegador. Cópialo antes de cerrar esta sesión.'}</p>
        <div className="sol-saved-summary"><FileText size={22}/><div><strong>{draft.title}</strong><span>Preparado · {persistent ? 'Guardado en este navegador' : 'Solo en esta sesión'}</span></div><span className="sol-prepared-dot"/></div>
        <p className="sol-boundary-note">El borrador está listo. No se ha enviado ni registrado en otro servicio.</p>
        <div className="sol-action-row"><button className="sol-btn sol-btn-yellow" onClick={newConcern}>Agregar otro pendiente <Plus size={17}/></button><button className="sol-btn sol-btn-outline" onClick={() => update(previous => ({ ...previous, phase: 'review' }))}>Revisar borrador <ArrowUpRight size={17}/></button></div>
        <button className="sol-quiet-link" onClick={() => update(previous => ({ ...previous, phase: 'paused' }))}>Terminar por ahora <Check size={15}/></button>
      </div> : state.phase === 'review' && draft ? <div className="sol-review-view">
        <div className="sol-review-top"><span className="sol-kicker">TU PRIMER PASO, PREPARADO</span><button className="sol-quiet-link" onClick={newConcern}>Cambiar objetivo <ArrowUpRight size={15}/></button></div>
        <h2 ref={headingRef} tabIndex={-1}>Ya no tienes que sostenerlo todo.</h2><p className="sol-intro-copy">Organicé tu ejemplo en un borrador. Revísalo y cambia lo que necesites.</p>
        <article className="sol-draft">
          <div className="sol-draft-heading"><span className="sol-state-badge"><FileText size={14}/> Borrador preparado</span><button className="sol-quiet-link" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? <Check size={15}/> : <Pencil size={15}/>} {editing ? 'Terminar edición' : 'Editar borrador'}</button></div>
          {editing ? <div className="sol-edit-fields">
            <label>Título<input value={draft.title} onChange={e => update(previous => updateDraft(previous, draft.id, { title: e.target.value }))} maxLength={180} required/></label>
            <label>Lo que me contaste<textarea value={draft.description} onChange={e => update(previous => updateDraft(previous, draft.id, { description: e.target.value }))} rows={3} maxLength={4000} required/></label>
            <label>Próximo paso<textarea value={draft.nextStep} onChange={e => update(previous => updateDraft(previous, draft.id, { nextStep: e.target.value }))} rows={3} maxLength={1500} required/></label>
          </div> : <><h3>{draft.title}</h3><p className="sol-draft-description">{draft.description}</p>{draft.items?.length > 0 && <div className="sol-organized-items"><span className="sol-kicker">{draft.kind === 'course' ? 'TUS CURSOS, EN ORDEN' : 'SEGUIMIENTO POR ALUMNO'}</span>{draft.items.slice(0, showAllItems ? 8 : 3).map((item, index) => <div className="sol-organized-row" key={index}><strong>{item.label}</strong><p>{item.detail}</p><small>{item.state}</small></div>)}{draft.items.length > 3 && <button className="sol-quiet-link" onClick={() => setShowAllItems(!showAllItems)}>{showAllItems ? 'Ver menos' : `Ver ${draft.items.length - 3} más`} <ChevronDown size={14}/></button>}</div>}<ol className="sol-plan">{draft.plan.map((step, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol><div className="sol-next-step"><span>PRÓXIMO PASO</span><p>{draft.nextStep}</p></div></>}
          {draft.reviewAt && <p className="sol-review-time">Revisión propuesta: <strong>{draft.reviewAt}</strong> · sin aviso programado</p>}
          <p className="sol-draft-source">Fuente: el ejemplo que acabas de escribir. No se consultaron servicios externos.</p>
        </article>
        {draft.kind === 'ticket' && <fieldset className="sol-question"><legend>¿La incidencia quedó solucionada?</legend><p>Esto aclara el estado del borrador; no registra ni cierra un ticket.</p><div className="sol-choice-row">{[['open', 'Sigue abierta'], ['solved', 'Solucionada'], ['unknown', 'No lo sé']].map(([value, label]) => <label key={value} className={draft.resolution === value ? 'selected' : ''}><input type="radio" name={`resolution-${draft.id}`} value={value} checked={draft.resolution === value} onChange={() => update(previous => updateDraft(previous, draft.id, { resolution: value }))}/>{draft.resolution === value && <Check size={14}/>} {label}</label>)}</div></fieldset>}
        <div className="sol-action-row"><button className="sol-btn sol-btn-yellow" onClick={saveDraft}><Save size={17}/> Guardar borrador</button><button className="sol-btn sol-btn-outline" onClick={copyDraft}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copiado' : 'Copiar texto'}</button><button className="sol-quiet-link" onClick={() => update(previous => ({ ...previous, phase: 'paused' }))}>Seguir después</button></div>
        <p className="sol-boundary-note">Sin conexiones obligatorias. Para actuar en otro servicio necesitarás una conexión y autorización.</p>
      </div> : <div className="sol-compose-view">
        <span className="sol-kicker">EMPECEMOS CON UNA COSA</span><h2>{state.uncertainStart ? '¿Qué te preocupa olvidar hoy?' : state.drafts.length ? '¿Qué quieres dejar encaminado?' : '¿Qué tienes en la cabeza?'}</h2>
        <p className="sol-intro-copy">{state.uncertainStart ? 'Escribe una sola cosa. No necesitas decidir qué es lo más importante.' : 'Cuéntamelo como te salga. Yo te ayudo a encontrar el siguiente paso.'}</p>
        <form className="sol-composer" onSubmit={prepare}><label className="sol-sr-only" htmlFor={`sol-concern-${normalized}`}>Un pendiente que quieras organizar</label><textarea id={`sol-concern-${normalized}`} ref={inputRef} value={state.input} onChange={e => update(previous => ({ ...previous, input: e.target.value }))} placeholder={profile.examples[0]} maxLength={4000} rows={3} required/><div className="sol-composer-bottom"><span>Con una frase basta.</span><button className="sol-send" type="submit" disabled={!state.input.trim()} aria-label="Preparar mi primer paso"><ArrowUpRight size={21}/></button></div></form>
        <div className="sol-examples"><span>O prueba con un ejemplo</span>{profile.examples.map((example, index) => <button key={example} onClick={() => { update(previous => ({ ...previous, input: example })); inputRef.current?.focus(); }}><span>{String(index + 1).padStart(2, '0')}</span><span>{example}</span><ArrowUpRight size={16}/></button>)}</div>
        <button className="sol-quiet-link sol-unsure" onClick={() => { update(previous => ({ ...previous, uncertainStart: true })); inputRef.current?.focus(); }}><HelpCircle size={16}/> No sé por dónde empezar</button>
        {state.drafts.length > 0 && <div className="sol-return-strip"><FileText size={17}/><span>Tienes {state.drafts.length} {state.drafts.length === 1 ? 'borrador preparado' : 'borradores preparados'}.</span><button onClick={() => setShowDrafts(!showDrafts)}>Retomar {showDrafts ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button></div>}
        {showDrafts && <div className="sol-draft-list">{state.drafts.map(item => <button key={item.id} onClick={() => { update(previous => ({ ...previous, activeDraftId: item.id, phase: 'review' })); setShowDrafts(false); }}><FileText size={17}/><span>{item.title}<small>Preparado · Sin enviar</small></span><ArrowRight size={17}/></button>)}</div>}
      </div>}
      {notice && <p className="sol-notice" role="status">{notice}<button aria-label="Cerrar aviso de SOL" onClick={() => setNotice('')}><X size={15}/></button></p>}
      {!persistent && <p className="sol-persistence-error" role="alert">No se pudo guardar en este navegador. Conserva una copia del borrador antes de cerrar.</p>}
    </div>
    <footer className="sol-assistant-footer"><span>Ejemplos ficticios · Respuestas guiadas · Sin envíos</span><button onClick={() => setShowMemory(!showMemory)} aria-expanded={showMemory}>Lo que recuerdo {showMemory ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button></footer>
    {showMemory && <div className="sol-inline-memory"><MemoryContent state={state} update={update} persistent={persistent}/></div>}
  </section>;
}
