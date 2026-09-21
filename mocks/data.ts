import { Vehicle } from '../types/vehicle';
import { TechnicalSheet, ComparisonMatrix, SpecField } from '../types/specs';
import { CustomerProfile } from '../types/profile';

/**
 * Dados e funções de mock usados somente quando USE_MOCKS = true
 * (modo offline/apresentação). Em produção (default) o app consome a API Java.
 */

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MOCK_LOGIN = {
  token: 'mock-jwt',
  name: 'Consultor Mock',
  dealership: 'Ford Matriz',
};

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 1, brand: 'Ford', model: 'Ranger', version: 'Raptor', year: 2024 },
  { id: 2, brand: 'Ram', model: '1500', version: 'RHO', year: 2024 },
];

export const MOCK_BRANDS = ['Ford', 'Ram', 'Chevrolet', 'Toyota'];

export const mockModels = (brand: string): string[] =>
  brand === 'Ford' ? ['Ranger', 'F-150'] : ['1500'];

export const mockVersions = (brand: string, model: string): string[] =>
  ['Raptor', 'Lariat'];

export const buildMockSheet = (): TechnicalSheet => {
  const specs: SpecField[] = [
    { id: 'e1', category: 'motor', label: 'Tipo de Motor', value: 'V6 Bi-Turbo' },
    { id: 'e2', category: 'motor', label: 'Cilindrada', value: '3.0', unit: 'L' },
    { id: 'e3', category: 'motor', label: 'Potência', value: '510', unit: 'cv' },
    { id: 'e4', category: 'motor', label: 'Torque', value: '583', unit: 'Nm' },
    { id: 'o1', category: 'offroad', label: 'Altura Livre', value: '272', unit: 'mm' },
    { id: 'o2', category: 'offroad', label: 'Imersão', value: '800', unit: 'mm' },
  ];

  return {
    vehicleId: MOCK_VEHICLES[0].id,
    vehicle: MOCK_VEHICLES[0],
    generatedAt: new Date().toISOString(),
    completeness: 100,
    specs,
  };
};

export const buildMockMatrix = (): ComparisonMatrix => ({
  vehicles: MOCK_VEHICLES,
  rows: [
    { specId: 'm-0', label: 'Potência', category: 'motor', values: ['510', '547'], winnerId: MOCK_VEHICLES[1].id },
    { specId: 'm-1', label: 'Torque', category: 'motor', values: ['583', '627'], winnerId: MOCK_VEHICLES[1].id },
    { specId: 'o-0', label: 'Altura Livre', category: 'offroad', values: ['272', '245'], winnerId: MOCK_VEHICLES[0].id },
    { specId: 't-0', label: 'Tela Multimídia', category: 'tech', values: ['12"', '12"'], winnerId: null },
  ],
  scores: [
    { vehicleId: MOCK_VEHICLES[0].id, axes: { motor: 8, offRoad: 10, tecnologia: 9, preco: 7, conforto: 6 } },
    { vehicleId: MOCK_VEHICLES[1].id, axes: { motor: 9, offRoad: 7, tecnologia: 7, preco: 5, conforto: 8 } },
  ],
});

export const buildMockProfile = (params: {
  attributes: string[];
}): CustomerProfile => {
  const isOffRoad = params.attributes.includes('offroad');
  return {
    type: isOffRoad ? 'enthusiast' : 'tech',
    label: isOffRoad ? 'Entusiasta' : 'Tecnológico',
    description: 'Perfil detectado com base na busca.',
    detectedSignals: [`Atributos: ${params.attributes.join(', ')}`],
    salesArguments: [
      { id: '1', title: 'Argumento Ford', description: 'Vantagem competitiva Raptor.', urgency: 'high' },
    ],
  };
};