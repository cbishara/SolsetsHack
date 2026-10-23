// Draft from Quito's agent in #6/#7. Local fixtures only, not an official API.
// Move shared types only after server/agent/mobile owners confirm the contract.
export type IncomingMessage = {
  id: string;
  source: "whatsapp" | "email" | "simulated";
  sender: string;
  group?: string;
  text: string;
  receivedAt: string;
};
export type Classification = {
  messageId: string;
  decision: "wake" | "report" | "noise";
  reason: string;
  isNew: boolean;
  confidence: number;
  incidentKey: string;
};
export type Verdict = Classification & {
  wouldWake: boolean;
  why:
    | "urgent"
    | "new"
    | "low_confidence"
    | "duplicate"
    | "off_duty"
    | "not_urgent";
};
// The feed envelope itself is proposed in #7; the agent's draft leaves it open.
export const proposedFeed: {
  title: string;
  message: IncomingMessage;
  verdict: Verdict;
}[] = [
  {
    title: "El servicio de prueba no responde",
    message: {
      id: "demo-1",
      source: "simulated",
      sender: "Equipo ficticio",
      text: "Caso ficticio: la VPN del entorno de demo está caída y no hay un procedimiento registrado.",
      receivedAt: "2026-10-23T23:41:00-03:00",
    },
    verdict: {
      messageId: "demo-1",
      decision: "wake",
      reason: "Incidente nuevo. En esta guardia ficticia, requiere revisión.",
      isNew: true,
      confidence: 0.93,
      incidentKey: "demo-vpn",
      wouldWake: true,
      why: "new",
    },
  },
  {
    title: "Un aviso repetido",
    message: {
      id: "demo-3",
      source: "simulated",
      sender: "Equipo ficticio",
      text: "Caso ficticio: vuelve el mismo aviso de VPN cinco minutos después.",
      receivedAt: "2026-10-23T23:46:00-03:00",
    },
    verdict: {
      messageId: "demo-3",
      decision: "wake",
      reason: "Duplicado de un incidente ya avisado hace cinco minutos.",
      isNew: false,
      confidence: 0.93,
      incidentKey: "demo-vpn",
      wouldWake: false,
      why: "duplicate",
    },
  },
  {
    title: "El informe puede esperar",
    message: {
      id: "demo-2",
      source: "simulated",
      sender: "Equipo ficticio",
      text: "Caso ficticio: piden el informe del turno para las 10:00.",
      receivedAt: "2026-10-24T00:18:00-03:00",
    },
    verdict: {
      messageId: "demo-2",
      decision: "report",
      reason: "Tiene plazo para la mañana; no describe una caída actual.",
      isNew: false,
      confidence: 0.94,
      incidentKey: "demo-report",
      wouldWake: false,
      why: "not_urgent",
    },
  },
];
