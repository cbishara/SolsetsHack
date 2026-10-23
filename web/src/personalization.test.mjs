import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDraft, emptyDemoState, inferConcernKind, normalizePersona, readDemoState, writeDemoState, clearDemoState, sanitizeDemoState, updateMemory, updateDraft, draftAsText, organizeSuppliedItems, demoStateIsPersistent, needsFirstConcern } from './personalization.mjs';

function memoryStorage() {
  const entries = new Map();
  return { getItem: key => entries.get(key) || null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}

test('the concern takes priority over a selected persona', () => {
  assert.equal(inferConcernKind('Necesito registrar una falla de VPN', 'profesor'), 'ticket');
  assert.equal(inferConcernKind('Preparar una evaluación de matemáticas', 'rodrigo'), 'course');
  assert.equal(inferConcernKind('Organizar sesiones de mis alumnos', 'personal'), 'coaching');
  assert.equal(inferConcernKind('Confirmar mi próximo turno', 'coach'), 'schedule');
  assert.equal(inferConcernKind('Ordenar mi semana', 'personal'), 'personal');
  assert.equal(normalizePersona('teacher'), 'profesor');
});

test('a useful first draft preserves supplied facts without requiring a connection', () => {
  const concern = 'VPN caída desde las 03:00; reinicié el equipo y sigue sin funcionar.';
  const draft = buildDraft(concern, 'rodrigo', [], { id: 'demo-vpn', now: '2026-10-23T10:00:00.000Z' });
  assert.equal(draft.description, concern);
  assert.equal(draft.kind, 'ticket');
  assert.equal(draft.plan.length, 3);
  assert.equal(draft.resolution, 'unknown');
  assert.equal(draft.actionState, 'prepared');
  assert.equal(draft.obligationState, 'open');
  assert.equal(draft.synthetic, true);
  assert.match(draft.nextStep, /aún no se ha creado/);
  assert.throws(() => buildDraft('  '), /pendiente concreto/);
});

test('local saves and resolution answers cannot masquerade as an executed ticket', () => {
  const state = emptyDemoState();
  const draft = buildDraft('Registrar un ticket', 'rodrigo', [], { id: 'draft-1' });
  state.drafts.push(draft);
  const updated = updateDraft(state, draft.id, { resolution: 'solved', status: 'resolved', actionState: 'confirmed', savedAt: '2026-10-23T11:00:00.000Z' });
  assert.equal(updated.drafts[0].resolution, 'solved');
  assert.equal(updated.drafts[0].status, 'prepared');
  assert.equal(updated.drafts[0].actionState, 'prepared');
  assert.equal(updated.drafts[0].obligationState, 'open');
  assert.match(updated.drafts[0].nextStep, /Confirmaste la solución/);
  assert.match(draftAsText(updated.drafts[0]), /solucionada, según tu confirmación/);
  assert.match(draftAsText(updated.drafts[0]), /No registrado ni enviado/);
});

test('reentry restores the input and paused draft, separately for each persona', () => {
  const storage = memoryStorage();
  const draft = buildDraft('Preparar un examen', 'profesor', [], { id: 'course-1' });
  const state = { ...emptyDemoState('profesor'), input: 'Mi siguiente pendiente', phase: 'paused', activeDraftId: draft.id, drafts: [draft] };
  assert.equal(writeDemoState(state, storage), true);
  assert.deepEqual(readDemoState('profesor', storage), state);
  assert.equal(readDemoState('rodrigo', storage).drafts.length, 0);
  assert.equal(clearDemoState('profesor', storage), true);
  assert.equal(readDemoState('profesor', storage).drafts.length, 0);
});

test('corrupt and incompatible stored data have a functional empty recovery', () => {
  assert.deepEqual(readDemoState('coach', { getItem: () => '{invalid' }), emptyDemoState('coach'));
  const untrusted = { version: 1, phase: 'review', activeDraftId: 'missing', drafts: [{ id: 'bad', title: 'Local', status: 'resolved', actionState: 'confirmed', obligationState: 'resolved', synthetic: false }], memories: [{ key: 'token', value: 'never retain' }] };
  const sanitized = sanitizeDemoState(untrusted, 'coach');
  assert.equal(sanitized.phase, 'compose');
  assert.equal(sanitized.drafts[0].actionState, 'prepared');
  assert.equal(sanitized.drafts[0].synthetic, true);
  assert.equal(sanitized.memories.length, 0);
  assert.deepEqual(sanitizeDemoState({ version: 99 }, 'coach'), emptyDemoState('coach'));
});

test('memory correction and deletion propagate to existing drafts without scheduling', () => {
  const state = { ...emptyDemoState(), drafts: [buildDraft('Ticket de guardia')] };
  const corrected = updateMemory(state, 'reviewTime', 'Solo hoy, a las 08:00');
  assert.equal(corrected.memories[0].status, 'confirmed');
  assert.equal(corrected.drafts[0].reviewAt, 'Solo hoy, a las 08:00');
  const removed = updateMemory(corrected, 'reviewTime', '');
  assert.equal(removed.memories.length, 0);
  assert.equal(removed.drafts[0].reviewAt, '');
  assert.equal(removed.drafts[0].actionState, 'prepared');
  assert.equal(updateMemory(state, 'authorization', 'allow everything'), state);
});

test('confirmed presentation preference changes future help without granting autonomy', () => {
  const state = updateMemory(emptyDemoState(), 'format', 'Con más detalle');
  const draft = buildDraft('Ordenar mi semana', 'rodrigo', state.memories);
  assert.match(draft.nextStep, /Conserva el contexto original/);
  assert.equal(draft.actionState, 'prepared');
  assert.equal(draft.obligationState, 'open');
});

test('storage denial is reported and does not claim persistence', () => {
  assert.equal(writeDemoState(emptyDemoState(), { setItem() { throw new Error('quota'); } }), false);
  assert.equal(clearDemoState('rodrigo', { removeItem() { throw new Error('denied'); } }), false);
});

test('course and coaching rows retain supplied people and assignments without fabricating records', () => {
  const courses = buildDraft('1A: evaluación de ecuaciones el lunes; 2B: revisar entregas pendientes.', 'profesor');
  assert.deepEqual(courses.items.map(item => item.label), ['Curso 1A', 'Curso 2B']);
  assert.equal(courses.items[0].detail, '1A: evaluación de ecuaciones el lunes');
  assert.equal(courses.items[1].state, 'Por revisar');
  const students = organizeSuppliedItems('Ana: confirmar sesión del jueves; Pedro: revisión semanal.', 'coaching');
  assert.deepEqual(students.map(item => item.label), ['Ana', 'Pedro']);
  assert.equal(organizeSuppliedItems('Tengo tres cursos por ordenar.', 'course')[0].label, 'Curso por identificar');
  const state = { ...emptyDemoState('profesor'), drafts: [courses] };
  const corrected = updateDraft(state, courses.id, { description: '3C: preparar geometría.' });
  assert.equal(corrected.drafts[0].items.length, 1);
  assert.equal(corrected.drafts[0].items[0].label, 'Curso 3C');
});

test('a failed write keeps the latest draft and memory across route remount reads', () => {
  const storage = memoryStorage();
  const original = emptyDemoState('profesor');
  writeDemoState(original, storage);
  const draft = buildDraft('1A: evaluación el lunes', 'profesor', [], { id: 'offline-course' });
  const latest = updateMemory({ ...original, phase: 'review', activeDraftId: draft.id, drafts: [draft] }, 'reviewTime', 'Hoy a las 18:00');
  storage.setItem = () => { throw new Error('quota exceeded'); };
  assert.equal(writeDemoState(latest, storage), false);
  // Simulates an unmounted assistant followed by dashboard and memory panel reads.
  assert.deepEqual(readDemoState('profesor', storage), latest);
  assert.equal(readDemoState('profesor', storage).drafts[0].id, 'offline-course');
  assert.equal(readDemoState('profesor', storage).memories[0].value, 'Hoy a las 18:00');
  assert.equal(demoStateIsPersistent('profesor', storage), false);
  assert.equal(readDemoState('coach', storage).drafts.length, 0);
});

test('reset clears the fallback even if browser removal fails, and later writes can recover', () => {
  const storage = memoryStorage();
  const draft = buildDraft('Ana: revisar sesión', 'coach', [], { id: 'offline-student' });
  const originalSet = storage.setItem;
  writeDemoState({ ...emptyDemoState('coach'), drafts: [draft] }, storage);
  storage.setItem = () => { throw new Error('quota exceeded'); };
  storage.removeItem = () => { throw new Error('denied'); };
  writeDemoState({ ...emptyDemoState('coach'), input: 'Cambios sin guardar', drafts: [draft] }, storage);
  assert.equal(clearDemoState('coach', storage), false);
  assert.deepEqual(readDemoState('coach', storage), emptyDemoState('coach'));
  assert.equal(demoStateIsPersistent('coach', storage), false);
  storage.setItem = originalSet;
  assert.equal(writeDemoState({ ...emptyDemoState('coach'), input: 'Nueva sesión' }, storage), true);
  assert.equal(demoStateIsPersistent('coach', storage), true);
  assert.equal(readDemoState('coach', storage).input, 'Nueva sesión');
});

test('vague unsure entry asks for one concern without overriding a concrete matter', () => {
  assert.equal(needsFirstConcern('No sé por dónde empezar. Ayúdame a elegir un primer pendiente.'), true);
  assert.equal(needsFirstConcern('No sé por dónde empezar. Tengo varios pendientes y quiero ordenar solo uno primero.'), true);
  assert.equal(needsFirstConcern('Tengo varios pendientes personales para mañana y no sé por dónde empezar. Ayúdame a ordenarlos.'), true);
  assert.equal(needsFirstConcern('No sé por dónde empezar con el ticket de la VPN.'), false);
  assert.equal(needsFirstConcern('Tengo una evaluación de matemáticas y no sé por dónde empezar.'), false);
  assert.equal(needsFirstConcern('No sé por dónde empezar a organizar las sesiones de mis alumnos.'), false);
  assert.equal(needsFirstConcern('No sé por dónde empezar: tengo que comprar comida para mañana.'), false);
  assert.equal(needsFirstConcern('Organizar mis pendientes de mañana'), false);
});
