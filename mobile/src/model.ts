export type Feedback = "correct" | "should-wake" | "should-wait";
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  inference?: { engine: string; model?: string; error?: string };
};
export type Memory = { key: string; value: string; evidence?: string };
export type Session = {
  id: string;
  messages: Message[];
  concern?: string;
  plan?: {
    title: string;
    nextStep: string;
    prepared?: string;
    minutes?: number;
  } | null;
  memory?: Memory[];
  preference?: { minutes: number } | null;
};
export type LocalState = {
  version: 1;
  onDuty: boolean | null;
  confirmedAt: string | null;
  feedback: Record<string, Feedback>;
  acknowledged: string[];
  session: Session;
  focusMinutes: number;
  focusFeedback: "helped" | "hard" | null;
};

export const examples = [
  {
    id: "demo-1",
    time: "23:41",
    title: "El servicio de prueba no responde",
    text: "Caso ficticio: la VPN del entorno de demo está caída y no hay un procedimiento registrado.",
    decision: "DESPERTAR",
    reason: "Incidente nuevo. En una guardia confirmada, requiere revisión.",
    source: "WhatsApp de prueba",
  },
  {
    id: "demo-2",
    time: "00:18",
    title: "El informe puede esperar",
    text: "Caso ficticio: piden el informe del turno para mañana a las 10:00.",
    decision: "PARTE",
    reason: "Tiene plazo para mañana; no describe una caída actual.",
    source: "WhatsApp de prueba",
  },
  {
    id: "demo-3",
    time: "00:23",
    title: "Un aviso repetido",
    text: "Caso ficticio: vuelve el mismo aviso de VPN cinco minutos después.",
    decision: "RUIDO",
    reason: "Ejemplo de duplicado de un incidente ya avisado.",
    source: "Semana simulada",
  },
] as const;

export function emptySession(): Session {
  return {
    id: "local:demo",
    messages: [],
    memory: [],
    concern: "",
    plan: null,
    preference: null,
  };
}
export function initialState(): LocalState {
  return {
    version: 1,
    onDuty: null,
    confirmedAt: null,
    feedback: {},
    acknowledged: [],
    session: emptySession(),
    focusMinutes: 15,
    focusFeedback: null,
  };
}

// Local design fixture, deliberately separate from the team's agent and API.
export function demoReply(session: Session, text: string, id: string): Session {
  const next: Session = structuredClone(session);
  const command = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  let reply: string;
  if (command === "borrar")
    return {
      ...emptySession(),
      messages: [
        {
          id: id + ":reply",
          role: "assistant",
          text: "Borré esta conversación local y sus preferencias.",
        },
      ],
    };
  if (command === "nuevo") {
    next.concern = "";
    next.plan = null;
    reply =
      "Empezamos con otro pendiente. Conservo las preferencias que confirmaste.";
  } else if (command === "memoria" || command === "resumen") {
    reply = [
      next.concern
        ? `Pendiente: ${next.concern}`
        : "No hay un pendiente anotado.",
      ...(next.memory || []).map((item) => item.value),
      next.plan?.nextStep,
    ]
      .filter(Boolean)
      .join("\n\n");
  } else if (/dos minutos|2 minutos|mas pequeno/.test(command)) {
    next.preference = { minutes: 2 };
    next.memory = [
      {
        key: "step-length",
        value: "Prefieres empezar con un paso de dos minutos.",
        evidence: text,
      },
    ];
    if (next.concern)
      next.plan = {
        title: "Solo el primer paso",
        nextStep:
          "Dedica dos minutos a escribir qué necesitas para retomar este pendiente mañana.",
        minutes: 2,
      };
    reply =
      "Lo ajustamos a dos minutos. Esta preferencia queda guardada para el próximo pendiente.";
  } else if (command === "me ayudo") {
    reply =
      "Queda anotado. Que la propuesta ayude no significa que el pendiente esté resuelto.";
  } else {
    next.concern = text;
    const minutes = next.preference?.minutes || 5;
    next.plan = {
      title: "Déjalo listo para retomar",
      nextStep: `Dedica ${minutes} minutos a escribir el primer paso y cuándo lo retomarás.`,
      minutes,
    };
    reply = `Lo dejamos anotado: «${text}».\n\n${next.plan.nextStep}\n\nSi es demasiado, prueba «MÁS PEQUEÑO».`;
  }
  next.messages = [
    ...next.messages,
    { id, role: "user" as const, text },
    {
      id: id + ":reply",
      role: "assistant" as const,
      text: reply,
      inference: { engine: "local-demo" },
    },
  ].slice(-60);
  return next;
}

export function feedbackMetrics(feedback: Record<string, Feedback>) {
  const values = examples.flatMap((item) =>
    feedback[item.id] ? [feedback[item.id]] : [],
  );
  return {
    reviewed: values.length,
    correct: values.filter((value) => value === "correct").length,
  };
}

export function restoreLocal(raw: string | null): LocalState {
  if (!raw) return initialState();
  const data = JSON.parse(raw);
  if (
    data.version !== 1 ||
    !Array.isArray(data.session?.messages) ||
    !data.feedback ||
    !Array.isArray(data.acknowledged)
  )
    throw new Error(
      "Los datos locales no tienen el formato esperado. No se han sobrescrito.",
    );
  return { ...initialState(), ...data };
}
