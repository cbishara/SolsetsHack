import type { Goal, RuleKind } from '../../data/types';

export const GOAL_LABEL: Record<Goal, string> = {
  guardia: 'Dormir tranquilo en guardia',
  orden: 'Tener todo ordenado',
  descargar: 'Sacarme cosas de la cabeza',
  dormir_mas: 'Dormir más',
  menos_despertares: 'Despertarme menos',
  constancia: 'Horarios más parejos',
};

export const RULE_GROUP: Record<RuleKind, { title: string; detail: string }> = {
  wake: { title: 'Me despierta', detail: 'Te aviso aunque estés durmiendo.' },
  wait: { title: 'Espera a la mañana', detail: 'Va al resumen de la mañana.' },
  task: { title: 'Se vuelve tarea', detail: 'La anoto con fecha en tus tareas.' },
  ignore: { title: 'Se ignora', detail: 'Lo leo, pero no te lo muestro.' },
};
