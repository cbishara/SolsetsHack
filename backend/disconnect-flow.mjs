// A bounded, deterministic conversation for the hackathon. No inferred diagnosis
// or device control: every remembered preference comes from an explicit reply.
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[.!?]+$/g, '');
export const blockerQuestion = '¿Qué te frena más?\n1 · No sé por dónde empezar.\n2 · Tengo demasiados pendientes.\n3 · Me voy a las redes.\nResponde 1, 2 o 3.';
const followUp = '\n\n¿Te sirve? Responde ME AYUDÓ, MÁS PEQUEÑO o CAMBIAR. También puedes pedir RESUMEN, NUEVO o BORRAR.';

export function emptyConversation() {
  return { phase: 'concern', concern: '', blocker: null, preference: null, plan: null, feedback: [], messages: [] };
}

function preparePlan(session) {
  const minutes = session.preference?.minutes || 5;
  const concern = session.concern.slice(0, 600);
  const plans = {
    clarity: {
      title: 'Un comienzo pequeño',
      nextStep: 'Durante ' + minutes + ' minutos, escribe solo el resultado que necesitas y el primer dato que te falta.',
      prepared: 'Pendiente: ' + concern + '\nResultado que necesito: por completar.\nPrimer dato que falta: por completar.',
    },
    overload: {
      title: 'Dejarlo fuera de tu cabeza',
      nextStep: 'Dedica ' + minutes + ' minutos a elegir qué puede esperar y cuándo quieres retomarlo. Confirma antes cualquier urgencia o relevo.',
      prepared: 'Queda pendiente: ' + concern + '\nLo retomaré: por confirmar.\nDependo de alguien: por confirmar.',
    },
    distraction: {
      title: 'Una pausa con intención',
      nextStep: 'Prueba ' + minutes + ' minutos con el teléfono fuera de alcance y una sola acción de tu pendiente. Después decide si quieres seguir.',
      prepared: 'Mi foco: ' + concern + '\nPrimera acción: escribir una frase que permita retomarlo.\nPausa elegida: ' + minutes + ' minutos. SOL no bloquea apps ni activa un temporizador.',
    },
  };
  return { ...plans[session.blocker], minutes, status: 'prepared', basis: session.preference ? 'Usé tu preferencia confirmada por pasos de 2 minutos.' : 'Usé el obstáculo que acabas de elegir.' };
}

export function advanceConversation(previous, input, now = new Date().toISOString()) {
  let session = structuredClone(previous || emptyConversation());
  const text = input.trim().slice(0, 2000);
  const command = normalize(text);
  let reply;
  if (command === 'borrar') {
    session = emptyConversation();
    return { session, erased: true, reply: 'Borré el contexto, las preferencias y el historial de esta conversación en SOL. Esto no borra los mensajes de WhatsApp. Conservamos solo identificadores técnicos para evitar procesar otra vez mensajes antiguos. Puedes empezar con otro ejemplo ficticio.' };
  }
  if (['nuevo', 'empezar de nuevo'].includes(command)) {
    session = { ...session, concern: '', blocker: null, plan: null, feedback: [], phase: 'concern' };
    reply = '¿Qué quieres dejar encaminado para desconectar hoy? Cuéntame un pendiente ficticio.' + (session.preference ? ' Recuerdo que prefieres pasos de 2 minutos.' : '');
  } else if (command === 'resumen') {
    reply = session.concern
      ? 'Lo que dejamos preparado:\n' + session.concern + '\n\n' + (session.plan?.nextStep || 'Falta elegir qué te frena.') + '\n\nEl pendiente sigue abierto. No envié mensajes a terceros, no confirmé un relevo ni programé avisos.'
      : 'Todavía no hay un pendiente. ¿Qué quieres dejar encaminado para desconectar hoy? Usa un ejemplo ficticio.';
  } else if (command === 'cambiar' || command === 'no me sirve') {
    if (session.concern) { session.phase = 'blocker'; session.plan = null; session.feedback = []; reply = 'Cambiemos la ayuda, conservando tu pendiente.\n' + blockerQuestion; }
    else reply = 'Primero cuéntame qué quieres dejar encaminado para desconectar hoy.';
  } else if (command === 'mas pequeno' && session.plan) {
    session.preference = { minutes: 2, source: 'Pediste un paso más pequeño', confirmedAt: now };
    session.plan = preparePlan(session);
    reply = 'Lo hacemos más pequeño y lo recordaré para tu próximo pendiente.\n\n' + session.plan.nextStep + '\n\n' + session.plan.prepared + followUp;
  } else if (['me ayudo', 'me sirvio', 'listo'].includes(command) && session.plan) {
    session.feedback = [...session.feedback, { value: 'helpful', at: now, blocker: session.blocker, minutes: session.plan.minutes }].slice(-20);
    session.phase = 'review';
    reply = 'Guardé que esta ayuda te sirvió. Tu pendiente sigue registrado; esto no confirma que esté resuelto. Puedes dejarlo aquí y retomarlo con RESUMEN. Para otro pendiente, escribe NUEVO.';
  } else if (session.phase === 'concern') {
    if (/^(hola( sol)?|sol|empezar|quiero desconectar|ayuda)$/.test(command)) {
      reply = 'Soy SOL. Vamos a dejar algo encaminado para que puedas desconectar. Esta demo usa ejemplos ficticios y recuerda lo que confirmas; escribe BORRAR para eliminarlo.\n\n¿Qué pendiente tienes dando vueltas hoy?';
    } else if (text.length < 8) {
      reply = 'Cuéntame un poco más del pendiente, por ejemplo: «Terminé mi turno y me falta preparar el registro de la VPN».';
    } else {
      session.concern = text;
      session.phase = 'blocker';
      reply = 'Dejé anotado: «' + text.slice(0, 600) + '».\n\n' + blockerQuestion;
    }
  } else if (session.phase === 'blocker') {
    const choices = { '1': 'clarity', 'no se por donde empezar': 'clarity', '2': 'overload', 'tengo demasiados pendientes': 'overload', '3': 'distraction', 'me voy a las redes': 'distraction' };
    const blocker = Object.hasOwn(choices, command) ? choices[command] : null;
    if (!blocker) reply = 'Para esta demo guiada, elige la opción que más se acerque. Puedes cambiarla después.\n' + blockerQuestion;
    else {
      session.blocker = blocker;
      session.phase = 'review';
      session.plan = preparePlan(session);
      reply = session.plan.title + '\n\n' + session.plan.nextStep + '\n\nTe dejo esto preparado:\n' + session.plan.prepared + followUp;
    }
  } else {
    reply = 'Tu pendiente sigue guardado. Para ajustar la ayuda responde MÁS PEQUEÑO o CAMBIAR; para contar otro pendiente, NUEVO; para retomarlo, RESUMEN.';
  }
  return { session, reply, erased: false };
}
