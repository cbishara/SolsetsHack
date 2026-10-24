import type { Goal } from '../../data/types';

/** Navigation handed to each onboarding step. */
export type StepNav = {
  index: number; // 1-based position for the progress bar
  total: number;
  next: () => void;
  back?: () => void;
  stepKey: string;
};

/** Choices made during onboarding that only matter while it runs. */
export type Draft = {
  goals: Goal[];
  permissions: { notifications: boolean; call: boolean };
};

export const GOALS: { id: Goal; title: string; detail: string }[] = [
  { id: 'orden', title: 'Tener todo lo que me llega ordenado', detail: 'Correos y mensajes convertidos en tareas y eventos con fecha' },
  { id: 'guardia', title: 'Que me avisen de noche solo si es urgente', detail: 'Para guardias, turnos o cualquier cosa que no puede esperar' },
  { id: 'descargar', title: 'Sacarme pendientes de la cabeza', detail: 'Decirle a Sol lo que tengo que hacer y soltarlo' },
  { id: 'menos_despertares', title: 'Desconectarme al terminar el día', detail: 'Un resumen que me deje tranquilo de que nada se me pasa' },
  { id: 'dormir_mas', title: 'Dormir mejor', detail: 'Acostarme antes porque nada queda abierto' },
  { id: 'constancia', title: 'Horarios más constantes', detail: 'Un cierre del día parecido cada noche' },
];
