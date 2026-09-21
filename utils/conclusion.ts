import { ComparisonMatrix } from '../types/specs';
import { RadarAxes } from '../types/radar';

const AXIS_LABELS: Record<keyof RadarAxes, string> = {
  motor: 'potência bruta',
  offRoad: 'capacidade off-road',
  tecnologia: 'tecnologia embarcada',
  preco: 'custo-benefício',
  conforto: 'conforto',
};

const AXES = Object.keys(AXIS_LABELS) as (keyof RadarAxes)[];

/**
 * Gera a conclusão comparativa a partir dos scores do radar, sem
 * textos hardcoded: cada veículo recebe os eixos onde tem vantagem
 * (diferença >= 0.5) e o vencedor é o de mais eixos.
 */
export const buildConclusion = (matrix: ComparisonMatrix): string => {
  const { vehicles, scores } = matrix;
  if (vehicles.length < 2) {
    return 'Adicione pelo menos dois veículos para gerar uma conclusão comparativa.';
  }

  const scoreOf = (vehicleId: number) =>
    scores.find((score) => score.vehicleId === vehicleId)?.axes ?? {
      motor: 0,
      offRoad: 0,
      tecnologia: 0,
      preco: 0,
      conforto: 0,
    };

  const a = vehicles[0];
  const b = vehicles[1];
  const strengths: Record<number, string[]> = { [a.id]: [], [b.id]: [] };

  const scoreA = scoreOf(a.id);
  const scoreB = scoreOf(b.id);

  for (const axis of AXES) {
    const diff = scoreA[axis] - scoreB[axis];
    if (diff >= 0.5) strengths[a.id].push(AXIS_LABELS[axis]);
    else if (diff <= -0.5) strengths[b.id].push(AXIS_LABELS[axis]);
  }

  const label = (vehicle: typeof a) => `${vehicle.brand} ${vehicle.model}`;
  const sentences: string[] = [];

  if (strengths[a.id].length > 0) {
    sentences.push(`${label(a)} se destaca em ${strengths[a.id].join(' e ')}.`);
  }
  if (strengths[b.id].length > 0) {
    sentences.push(`Já o ${label(b)} possui vantagem em ${strengths[b.id].join(' e ')}.`);
  }

  const countA = strengths[a.id].length;
  const countB = strengths[b.id].length;

  if (countA > countB) {
    sentences.push(`Para clientes que priorizam esses diferenciais, o ${label(a)} é a escolha superior.`);
  } else if (countB > countA) {
    sentences.push(`Para clientes que priorizam esses diferenciais, o ${label(b)} é a escolha superior.`);
  } else if (countA === 0) {
    sentences.push('Os dois veículos apresentam desempenho equilibrado nos eixos avaliados — a decisão deve considerar o perfil individual do cliente.');
  } else {
    sentences.push('Os dois veículos estão equilibrados em pontos fortes distintos — a escolha depende do perfil do cliente.');
  }

  return sentences.join(' ');
};