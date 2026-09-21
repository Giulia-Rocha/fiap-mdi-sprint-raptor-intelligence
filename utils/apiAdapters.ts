import { Vehicle } from '../types/vehicle';
import { TechnicalSheet, ComparisonMatrix, SpecField, SpecCategory } from '../types/specs';

interface SpecMap {
  engine: { field: string; label: string; unit?: string }[];
  drivetrain: { field: string; label: string; unit?: string }[];
  suspension: { field: string; label: string; unit?: string }[];
  dimensions: { field: string; label: string; unit?: string }[];
  warranty: { field: string; label: string; unit?: string }[];
}

const SPEC_FIELDS: SpecMap = {
  engine: [
    { field: 'engineType', label: 'Tipo de Motor' },
    { field: 'displacement', label: 'Cilindrada', unit: 'L' },
    { field: 'horsepower', label: 'Potência', unit: 'cv' },
    { field: 'torque', label: 'Torque', unit: 'Nm' },
    { field: 'fuelSystem', label: 'Sistema de Alimentação' },
    { field: 'cylinders', label: 'Cilindros' },
  ],
  drivetrain: [
    { field: 'transmission', label: 'Transmissão' },
    { field: 'drivetrainType', label: 'Tração' },
    { field: 'differentialLock', label: 'Bloqueio do Diferencial' },
    { field: 'tractionControl', label: 'Controle de Tração' },
  ],
  suspension: [
    { field: 'frontSuspension', label: 'Suspensão Dianteira' },
    { field: 'rearSuspension', label: 'Suspensão Traseira' },
    { field: 'groundClearance', label: 'Altura Livre', unit: 'mm' },
    { field: 'approachAngle', label: 'Ângulo de Entrada', unit: '°' },
    { field: 'departureAngle', label: 'Ângulo de Saída', unit: '°' },
    { field: 'waterWading', label: 'Imersão', unit: 'mm' },
  ],
  dimensions: [
    { field: 'length', label: 'Comprimento', unit: 'mm' },
    { field: 'width', label: 'Largura', unit: 'mm' },
    { field: 'height', label: 'Altura', unit: 'mm' },
    { field: 'wheelbase', label: 'Entre-eixos', unit: 'mm' },
    { field: 'curbWeight', label: 'Peso', unit: 'kg' },
    { field: 'payload', label: 'Carga Útil', unit: 'kg' },
    { field: 'towingCapacity', label: 'Capacidade de Reboque', unit: 'kg' },
    { field: 'fuelTankCapacity', label: 'Tanque', unit: 'L' },
  ],
  warranty: [
    { field: 'basicWarranty', label: 'Garantia Básica' },
    { field: 'powertrainWarranty', label: 'Garantia do Trem de Força' },
    { field: 'corrosionWarranty', label: 'Garantia Anticorrosão' },
    { field: 'roadsideAssistance', label: 'Assistência 24h' },
  ],
};

const CATEGORY_BY_GROUP: Record<keyof SpecMap, SpecCategory> = {
  engine: 'motor',
  drivetrain: 'performance',
  suspension: 'offroad',
  dimensions: 'performance',
  warranty: 'commercial',
};

const isPresent = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== '';

function buildGroupSpecs(source: any, group: keyof SpecMap): SpecField[] {
  const specs: SpecField[] = [];
  SPEC_FIELDS[group].forEach((def, index) => {
    const raw = source?.[def.field];
    if (isPresent(raw)) {
      specs.push({
        id: `${group}-${index}`,
        category: CATEGORY_BY_GROUP[group],
        label: def.label,
        value: String(raw),
        unit: def.unit,
      });
    }
  });
  return specs;
}

/**
 * Converte o resumo de veículo da API para o modelo interno do Mobile.
 * O id é mantido como número (Integer/Long do backend), garantindo
 * consistência entre catálogo, ficha, comparativo e histórico.
 */
export const adaptVehicleSummary = (dto: any): Vehicle => ({
  id: dto.id,
  brand: dto.brandName || 'Ford',
  model: dto.model,
  version: dto.version,
  year: dto.modelYear,
});

/**
 * Converte o detalhe do veículo (DTO complexo) para a Ficha Técnica (TechnicalSheet).
 * A API retorna objetos separados (engineSpecs, drivetrainSpecs, suspensionSpecs,
 * dimensions, warranty); o Mobile espera um array flat de specs. A completude é
 * calculada pela razão entre campos preenchidos e o total de campos esperados.
 */
export const adaptVehicleDetail = (dto: any): TechnicalSheet => {
  const specs: SpecField[] = [
    ...buildGroupSpecs(dto.engineSpecs, 'engine'),
    ...buildGroupSpecs(dto.drivetrainSpecs, 'drivetrain'),
    ...buildGroupSpecs(dto.suspensionSpecs, 'suspension'),
    ...buildGroupSpecs(dto.dimensions, 'dimensions'),
    ...buildGroupSpecs(dto.warranty, 'warranty'),
  ];

  const totalCandidates = Object.values(SPEC_FIELDS).reduce(
    (sum, group) => sum + group.length,
    0
  );

  return {
    vehicleId: dto.id,
    vehicle: adaptVehicleSummary(dto),
    specs,
    generatedAt: new Date().toISOString(),
    completeness: specs.length === 0
      ? 0
      : Math.round((specs.length / totalCandidates) * 100),
  };
};

const toNumeric = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  const str = String(value);
  if (str.toLowerCase() === 'sim') return 1;
  if (str.toLowerCase() === 'não' || str.toLowerCase() === 'nao') return 0;
  const match = str.match(/[-+]?\d+(?:[.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : null;
};

const pickWinnerId = (
  values: (string | null)[],
  vehicles: Vehicle[]
): number | null => {
  let best: number | null = null;
  let bestIndex: number | null = null;
  let tie = false;

  values.forEach((value, index) => {
    const numeric = toNumeric(value);
    if (numeric === null) return;
    if (best === null) {
      best = numeric;
      bestIndex = index;
    } else if (numeric > best) {
      best = numeric;
      bestIndex = index;
      tie = false;
    } else if (numeric === best) {
      tie = true;
    }
  });

  if (bestIndex === null || tie) return null;
  return vehicles[bestIndex].id;
};

/**
 * Converte o mapa de categorias da API para a matriz de comparação do Mobile.
 * O vencedor de cada linha é resolvido localmente (comparação numérica dos
 * valores); specs textuais iguais ou sem dado numérico não têm vencedor.
 */
export const adaptCompareResponse = (dto: any): ComparisonMatrix => {
  const vehicles = dto.vehicles.map(adaptVehicleSummary);
  const rows: ComparisonMatrix['rows'] = [];
  const scores: ComparisonMatrix['scores'] = [];

  Object.keys(dto.categories || {}).forEach((catKey) => {
    const categoryData = dto.categories[catKey];
    const categoryName = (catKey.charAt(0).toUpperCase() + catKey.slice(1)) as SpecCategory;

    categoryData.specs.forEach((spec: any, index: number) => {
      const values = vehicles.map((vehicle: Vehicle) => {
        const raw = spec.values[vehicle.id];
        if (Array.isArray(raw)) return raw.join(', ');
        if (isPresent(raw)) return String(raw);
        return null;
      });

      rows.push({
        specId: `${catKey}-${index}`,
        label: spec.label,
        category: categoryName.toLowerCase() as SpecCategory,
        values,
        winnerId: pickWinnerId(values, vehicles),
      });
    });

    vehicles.forEach((vehicle: Vehicle) => {
      let vehicleScore = scores.find((score) => score.vehicleId === vehicle.id);
      if (!vehicleScore) {
        vehicleScore = { vehicleId: vehicle.id, axes: { motor: 0, offRoad: 0, tecnologia: 0, preco: 0, conforto: 0 } };
        scores.push(vehicleScore);
      }

      const scoreValue = categoryData.radarScore[vehicle.id]
        ? categoryData.radarScore[vehicle.id] / 10
        : 0;

      if (catKey === 'motor') vehicleScore.axes.motor = scoreValue;
      else if (catKey === 'offroad') vehicleScore.axes.offRoad = scoreValue;
      else if (catKey === 'tecnologia') vehicleScore.axes.tecnologia = scoreValue;
      else if (catKey === 'preco') vehicleScore.axes.preco = scoreValue;
      else if (catKey === 'conforto') vehicleScore.axes.conforto = scoreValue;
    });
  });

  return { vehicles, rows, scores };
};