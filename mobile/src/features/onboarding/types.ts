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
  { id: 'guardia', title: 'Hacer guardia sin vigilar el teléfono', detail: 'Que Sol mire por ti y te despierte solo si es urgente' },
  { id: 'orden', title: 'Tener el día ordenado', detail: 'Tareas y calendario armados desde tu correo y WhatsApp' },
  { id: 'descargar', title: 'Sacarme pendientes de la cabeza', detail: 'Dictar lo que tienes que hacer y soltarlo' },
  { id: 'dormir_mas', title: 'Dormir más horas', detail: 'Acostarte antes porque nada queda abierto' },
  { id: 'menos_despertares', title: 'Despertarme menos de noche', detail: 'Que nada te interrumpa si no es necesario' },
  { id: 'constancia', title: 'Horarios más constantes', detail: 'Un cierre del día parecido cada noche' },
];
