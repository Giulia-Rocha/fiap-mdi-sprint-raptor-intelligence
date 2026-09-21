import { Vehicle } from './vehicle';
import { RadarAxes } from './radar';

export type SpecCategory =
  | 'motor'
  | 'offroad'
  | 'performance'
  | 'safety'
  | 'tech'
  | 'commercial';

export interface SpecField {
  id: string;
  category: SpecCategory;
  label: string;
  value: string | null;
  unit?: string;
  source?: string;
  updatedAt?: string;
}

export interface TechnicalSheet {
  vehicleId: number;
  vehicle: Vehicle;
  specs: SpecField[];
  generatedAt: string;
  completeness: number;
}

export interface ComparisonMatrix {
  vehicles: Vehicle[];
  rows: ComparisonRow[];
  scores: RadarScore[];
}

export interface ComparisonRow {
  specId: string;
  label: string;
  category: SpecCategory;
  values: (string | null)[];
  winnerId: number | null;
}

export interface RadarScore {
  vehicleId: number;
  axes: RadarAxes;
}
