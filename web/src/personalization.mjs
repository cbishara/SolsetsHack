// This local workspace contains demonstration data only. It never authorizes
// or executes actions in connected services.
export const DEMO_STORAGE_VERSION = 1;
export const DEMO_EVENT = 'solsets-demo-updated';
const STORAGE_PREFIX = 'solsets.sol.demo.v1.';
// Survives React unmounts and route changes, but deliberately not a page reload.
// Dirty entries take precedence over stale browser data after a failed write.
const sessionCache = new Map();
const injectedStorageCaches = new WeakMap();
const text = (value, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
const iso = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : new Date().toISOString();

export const PERSONAS = {
  rodrigo: { name: 'Rodrigo', label: 'Turnos y pendientes', examples: ['Terminó mi guardia y necesito dejar un ticket por la falla de VPN.', 'Tengo un cambio de turno pendiente de confirmar.', 'Necesito ordenar lo que quedó abierto antes del relevo.'] },
  profesor: { name: 'Profesor', label: 'Clases y cursos', examples: ['Tengo que preparar una evaluación de ecuaciones para mi curso.', 'Quiero ordenar las entregas pendientes de mis cursos.', 'Necesito preparar la próxima clase de matemáticas.'] },
  coach: { name: 'Coach', label: 'Alumnos y sesiones', examples: ['Necesito organizar las sesiones y el seguimiento de mis alumnos.', 'Tengo que preparar la revisión semanal de mis alumnos.', 'Quiero ordenar los cambios de horario de esta semana.'] },
  personal: { name: 'Mi día', label: 'Vida cotidiana', examples: ['Tengo varias cosas para mañana y me preocupa olvidar alguna.', 'Necesito coordinar una compra para la casa.', 'Quiero dejar ordenados mis pendientes de esta semana.'] },
};

export function normalizePersona(value) {
  const aliases = { teacher: 'profesor', professor: 'profesor', gym: 'coach', life: 'personal', familia: 'personal' };
  const candidate = aliases[value] || value;
  return Object.hasOwn(PERSONAS, candidate) ? candidate : 'rodrigo';
}

export function emptyDemoState(persona = 'rodrigo') {
  return { version: DEMO_STORAGE_VERSION, persona: normalizePersona(persona), phase: 'compose', input: '', activeDraftId: null, drafts: [], memories: [], uncertainStart: false };
}

export function sanitizeDemoState(value, persona = 'rodrigo') {
  const clean = emptyDemoState(persona);
  if (!value || typeof value !== 'object' || value.version !== DEMO_STORAGE_VERSION) return clean;
  clean.input = text(value.input);
  clean.uncertainStart = Boolean(value.uncertainStart);
  clean.drafts = (Array.isArray(value.drafts) ? value.drafts : []).slice(0, 50).filter(d => d && typeof d.id === 'string' && d.id && typeof d.title === 'string').map(d => ({
    id: text(d.id, 100), persona: clean.persona, kind: ['ticket', 'course', 'coaching', 'personal', 'schedule'].includes(d.kind) ? d.kind : 'personal',
    title: text(d.title, 180), description: text(d.description), nextStep: text(d.nextStep, 1500), concern: text(d.concern),
    plan: (Array.isArray(d.plan) ? d.plan : []).filter(p => typeof p === 'string').slice(0, 3).map(p => text(p, 500)),
    items: (Array.isArray(d.items) ? d.items : []).filter(item => item && typeof item.detail === 'string').slice(0, 8).map(item => ({ label: text(item.label, 100), detail: text(item.detail, 700), state: 'Por revisar' })),
    resolution: ['open', 'solved', 'unknown'].includes(d.resolution) ? d.resolution : 'unknown',
    // A local draft can never be evidence that a ticket was registered or sent.
    status: 'prepared', actionState: 'prepared', obligationState: 'open', synthetic: true,
    reviewAt: text(d.reviewAt, 160), createdAt: iso(d.createdAt), updatedAt: iso(d.updatedAt), savedAt: d.savedAt ? iso(d.savedAt) : null,
  }));
  clean.memories = (Array.isArray(value.memories) ? value.memories : []).filter(m => m && ['format', 'reviewTime'].includes(m.key) && typeof m.value === 'string' && m.value.trim()).slice(0, 2).map(m => ({ key: m.key, value: text(m.value, 160), source: 'Tú lo confirmaste', status: 'confirmed', updatedAt: iso(m.updatedAt) }));
  clean.activeDraftId = clean.drafts.some(d => d.id === value.activeDraftId) ? value.activeDraftId : null;
  clean.phase = ['compose', 'review', 'saved', 'paused'].includes(value.phase) ? value.phase : 'compose';
  if (['review', 'saved'].includes(clean.phase) && !clean.activeDraftId) clean.phase = 'compose';
  return clean;
}

function storageOrDefault(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}

function cacheFor(storage) {
  if (!storage) return sessionCache;
  if (!injectedStorageCaches.has(storage)) injectedStorageCaches.set(storage, new Map());
  return injectedStorageCaches.get(storage);
}

function announceChange(persona) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: { persona } }));
}

export function demoStateIsPersistent(persona = 'rodrigo', storage) {
  const normalized = normalizePersona(persona);
  const cache = cacheFor(storage);
  if (!cache.has(normalized)) readDemoState(normalized, storage);
  return cache.get(normalized)?.persistent === true;
}

export function readDemoState(persona = 'rodrigo', storage) {
  const normalized = normalizePersona(persona);
  const cache = cacheFor(storage);
  const previous = cache.get(normalized);
  if (previous?.dirty) return sanitizeDemoState(previous.state, normalized);
  try {
    const target = storageOrDefault(storage);
    if (!target) throw new Error('Browser storage unavailable');
    const raw = target.getItem(STORAGE_PREFIX + normalized);
    const state = raw ? sanitizeDemoState(JSON.parse(raw), normalized) : emptyDemoState(normalized);
    cache.set(normalized, { state, persistent: true, dirty: false });
    return sanitizeDemoState(state, normalized);
  } catch {
    const state = previous?.state || emptyDemoState(normalized);
    cache.set(normalized, { state, persistent: false, dirty: Boolean(previous) });
    return sanitizeDemoState(state, normalized);
  }
}

export function writeDemoState(state, storage) {
  const safe = sanitizeDemoState(state, state.persona);
  const cache = cacheFor(storage);
  const target = storageOrDefault(storage);
  let persistent = false;
  try {
    if (!target) throw new Error('Browser storage unavailable');
    target.setItem(STORAGE_PREFIX + safe.persona, JSON.stringify(safe));
    persistent = true;
  } catch { /* Keep the latest draft in this page's session. */ }
  cache.set(safe.persona, { state: safe, persistent, dirty: !persistent });
  announceChange(safe.persona);
  return persistent;
}

export function clearDemoState(persona = 'rodrigo', storage) {
  const normalized = normalizePersona(persona);
  const cache = cacheFor(storage);
  const target = storageOrDefault(storage);
  let persistent = false;
  try {
    if (!target) throw new Error('Browser storage unavailable');
    target.removeItem(STORAGE_PREFIX + normalized);
    persistent = true;
  } catch { /* Clear the session copy even when durable removal is unavailable. */ }
  cache.set(normalized, { state: emptyDemoState(normalized), persistent, dirty: !persistent });
  announceChange(normalized);
  return persistent;
}

export function demoTasks(persona = 'rodrigo') { return readDemoState(persona).drafts; }

export function openDemoDraft(persona, id) {
  const state = readDemoState(persona);
  if (!state.drafts.some(draft => draft.id === id)) return false;
  return writeDemoState({ ...state, activeDraftId: id, phase: 'review' });
}

// Group literal details from the supplied example, without inventing students,
// courses, dates, or assignments that the user has not provided.
export function organizeSuppliedItems(concern, kind) {
  if (!['course', 'coaching'].includes(kind)) return [];
  const clauses = concern.split(/[;\n]+|\.\s+(?=[A-ZÁÉÍÓÚÑ0-9])/).map(value => value.trim()).filter(Boolean).slice(0, 8);
  return clauses.map(detail => {
    const course = detail.match(/\b(?:curso\s+)?(\d{1,2}\s*[º°]?\s*[A-F])\b/i)?.[1];
    const named = detail.match(/^(?:Para\s+|Alumno\s+|Alumna\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\s*:/)?.[1];
    return { label: kind === 'course' ? course ? `Curso ${course.replace(/\s+/g, '')}` : 'Curso por identificar' : named || 'Alumno por identificar', detail, state: 'Por revisar' };
  });
}

export function inferConcernKind(concern, persona = 'rodrigo') {
  const normalized = concern.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(ticket|incidencia|vpn|servidor|falla|incidente)\b/.test(normalized)) return 'ticket';
  if (/\b(curso|cursos|clase|clases|evaluacion|examen|matematicas|profesor|entrega|entregas)\b/.test(normalized)) return 'course';
  if (/\b(coach|gimnasio|rutina|sesiones|entrenamiento|alumnos)\b/.test(normalized)) return 'coaching';
  if (/\b(turno|turnos|guardia|relevo|horario)\b/.test(normalized)) return 'schedule';
  return { profesor: 'course', coach: 'coaching' }[normalizePersona(persona)] || 'personal';
}

export function needsFirstConcern(concern) {
  const normalized = text(concern).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const uncertain = /\bno se (?:por )?donde (?:empezar|comenzar)\b/.test(normalized);
  if (!uncertain) return false;
  // An uncertainty phrase must not discard an actual supplied concern.
  if (inferConcernKind(normalized, 'personal') !== 'personal') return false;
  return !/\b(compra|compras|comprar|pagar|pago|pagos|recoger|retirar|cita|reunion|reuniones|viaje|viajar|medicamento|medicamentos|tramite|tramites|cumpleanos|colegio|horarios|evaluaciones|estudiantes)\b/.test(normalized);
}

export function buildDraft(concern, persona = 'rodrigo', memories = [], options = {}) {
  const original = text(concern).trim();
  if (!original) throw new Error('Cuéntame un pendiente concreto para preparar un borrador.');
  const kind = inferConcernKind(original, persona);
  const compact = memories.find(m => m.key === 'format')?.value !== 'Con más detalle';
  const reviewAt = memories.find(m => m.key === 'reviewTime')?.value || '';
  const templates = {
    ticket: {
      title: /vpn/i.test(original) ? 'Registro de incidencia · VPN' : 'Registro de incidencia del turno',
      plan: ['Dejar por escrito lo ocurrido y las acciones realizadas.', 'Confirmar si la incidencia sigue abierta.', 'Revisar el borrador antes de registrarlo en el sistema.'],
      nextStep: 'Completar qué se intentó y confirmar el estado de la incidencia. El registro aún no se ha creado en un sistema de tickets.',
    },
    course: {
      title: /evaluaci[oó]n|examen/i.test(original) ? 'Preparar la próxima evaluación' : 'Organizar el trabajo del curso',
      plan: ['Identificar el curso y el objetivo de la actividad.', 'Separar material listo, entregas pendientes y dudas.', 'Confirmar la fecha y preparar el siguiente paso.'],
      nextStep: 'Anotar el curso, la fecha y el material disponible; con eso puedes preparar la actividad sin mezclarla con otros cursos.',
    },
    coaching: {
      title: 'Organizar el seguimiento de alumnos',
      plan: ['Agrupar alumnos por próxima sesión.', 'Anotar qué seguimiento tiene pendiente cada uno.', 'Confirmar los horarios antes de proponer cambios.'],
      nextStep: 'Preparar una lista con alumno, próxima sesión y seguimiento pendiente. Los horarios quedan por confirmar.',
    },
    schedule: {
      title: 'Aclarar el próximo turno',
      plan: ['Anotar el horario propuesto y su fuente.', 'Confirmar la fecha y quién acepta el cambio.', 'Actualizar el calendario solo cuando esté confirmado.'],
      nextStep: 'Confirmar la fecha, la hora y la persona responsable del cambio. Tener una propuesta no confirma un relevo.',
    },
    personal: {
      title: 'Dejar encaminado un pendiente',
      plan: ['Separar lo que necesita una decisión de lo que puede esperar.', 'Elegir una primera acción pequeña.', 'Confirmar el plazo solo si cambia el siguiente paso.'],
      nextStep: 'Elegir una acción concreta de tu lista y anotar qué necesitas para hacerla. Lo demás puede quedar preparado para después.',
    },
  };
  const template = templates[kind];
  const now = options.now || new Date().toISOString();
  const id = options.id || `local-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  return {
    id, persona: normalizePersona(persona), kind, title: template.title, description: original,
    concern: original, nextStep: compact ? template.nextStep : `${template.nextStep} Conserva el contexto original para revisar la propuesta antes de actuar.`,
    plan: template.plan, items: organizeSuppliedItems(original, kind), resolution: 'unknown', status: 'prepared', actionState: 'prepared', obligationState: 'open',
    synthetic: true, reviewAt, createdAt: now, updatedAt: now, savedAt: null,
  };
}

export function updateDraft(state, id, changes) {
  const allowed = {};
  for (const key of ['title', 'description', 'nextStep', 'resolution', 'savedAt']) if (Object.hasOwn(changes, key)) allowed[key] = changes[key];
  return sanitizeDemoState({ ...state, drafts: state.drafts.map(d => {
    if (d.id !== id) return d;
    const next = { ...d, ...allowed, updatedAt: new Date().toISOString() };
    if (Object.hasOwn(changes, 'description')) next.items = organizeSuppliedItems(text(changes.description), d.kind);
    if (d.kind === 'ticket' && ['open', 'solved', 'unknown'].includes(changes.resolution)) {
      const guidance = {
        open: ['Dejar explícito que la incidencia sigue abierta.', 'Completar las acciones realizadas y quién debe revisar el pendiente. La incidencia sigue abierta; aún no se ha creado un ticket.'],
        solved: ['Anotar cómo se solucionó, según tu confirmación.', 'Completar las acciones que solucionaron la incidencia y revisar el registro. Confirmaste la solución; el ticket aún no se ha creado.'],
        unknown: ['Confirmar si la incidencia sigue abierta.', 'Completar qué se intentó y confirmar el estado de la incidencia. El registro aún no se ha creado en un sistema de tickets.'],
      }[changes.resolution];
      next.plan = next.plan.map((step, index) => index === 1 ? guidance[0] : step);
      // Keep a user's independently edited next step; only recalculate generated text.
      if (/^Completar (qué se intentó|las acciones realizadas|las acciones que solucionaron)/.test(d.nextStep)) next.nextStep = guidance[1];
    }
    return next;
  }) }, state.persona);
}

export function updateMemory(state, key, value) {
  if (!['format', 'reviewTime'].includes(key)) return state;
  const cleanValue = text(value, 160).trim();
  const memories = state.memories.filter(m => m.key !== key);
  if (cleanValue) memories.push({ key, value: cleanValue, source: 'Tú lo confirmaste', status: 'confirmed', updatedAt: new Date().toISOString() });
  const drafts = state.drafts.map(d => ({
    ...d,
    // The editable reminder applies only to the local scenario. It schedules nothing.
    ...(key === 'reviewTime' ? { reviewAt: cleanValue } : {}),
    updatedAt: new Date().toISOString(),
  }));
  return sanitizeDemoState({ ...state, memories, drafts }, state.persona);
}

export function draftAsText(draft) {
  const incidentState = draft.kind === 'ticket' ? `\n\nEstado de la incidencia: ${{ open: 'sigue abierta, según tu confirmación', solved: 'solucionada, según tu confirmación', unknown: 'por confirmar' }[draft.resolution] || 'por confirmar'}.` : '';
  return `${draft.title}\n\n${draft.description}${incidentState}\n\nPróximo paso\n${draft.nextStep}${draft.reviewAt ? `\n\nRevisión propuesta: ${draft.reviewAt}` : ''}\n\nBorrador de demostración. No registrado ni enviado a servicios externos.`;
}
