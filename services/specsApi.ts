import { Vehicle, SearchParams } from '../types/vehicle';
import { TechnicalSheet, ComparisonMatrix } from '../types/specs';
import { CustomerProfile } from '../types/profile';
import { USE_MOCKS } from '../config/env';
import { apiClient } from './apiClient';
import {
  adaptVehicleSummary,
  adaptVehicleDetail,
  adaptCompareResponse,
  adaptCustomerProfile,
} from '../utils/apiAdapters';
import {
  delay,
  MOCK_LOGIN,
  MOCK_VEHICLES,
  MOCK_BRANDS,
  mockModels,
  mockVersions,
  buildMockSheet,
  buildMockMatrix,
  buildMockProfile,
} from '../mocks/data';

export const specsApi = {
  login: async (email: string, password: string): Promise<any> => {
    if (USE_MOCKS) {
      await delay(800);
      return MOCK_LOGIN;
    }
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  getVehicles: async (): Promise<Vehicle[]> => {
    if (USE_MOCKS) {
      await delay(300);
      return MOCK_VEHICLES;
    }
    const response = await apiClient.get('/vehicles');
    return response.data.map(adaptVehicleSummary);
  },

  getBrands: async (): Promise<string[]> => {
    if (USE_MOCKS) {
      await delay(500);
      return MOCK_BRANDS;
    }
    const response = await apiClient.get('/brands');
    if (Array.isArray(response.data)) {
      return response.data.map((brand: any) => brand.name);
    }
    return [];
  },

  getModels: async (brand: string): Promise<string[]> => {
    if (USE_MOCKS) {
      await delay(500);
      return mockModels(brand);
    }
    // A API Java não tem /models isolado, então filtramos do /vehicles
    const response = await apiClient.get('/vehicles');
    const vehicles = response.data as any[];
    const models = vehicles
      .filter(vehicle => vehicle.brandName === brand)
      .map(vehicle => vehicle.model);
    return Array.from(new Set(models));
  },

  getVersions: async (brand: string, model: string): Promise<string[]> => {
    if (USE_MOCKS) {
      await delay(500);
      return mockVersions(brand, model);
    }
    const response = await apiClient.get('/vehicles');
    const vehicles = response.data as any[];
    return vehicles
      .filter(vehicle => vehicle.brandName === brand && vehicle.model === model)
      .map(vehicle => vehicle.version);
  },

  getVehicleSpecs: async (vehicleId: number): Promise<TechnicalSheet> => {
    if (USE_MOCKS) {
      await delay(1000);
      return buildMockSheet();
    }
    const response = await apiClient.get(`/vehicles/${vehicleId}`);
    return adaptVehicleDetail(response.data);
  },

  compareVehicles: async (ids: number[]): Promise<ComparisonMatrix> => {
    if (USE_MOCKS) {
      await delay(1200);
      return buildMockMatrix();
    }
    const response = await apiClient.get('/compare', {
      params: { ids: ids.join(',') }
    });
    return adaptCompareResponse(response.data);
  },

  getSavedComparisons: async (): Promise<any[]> => {
    if (USE_MOCKS) return [];
    const response = await apiClient.get('/comparisons');
    return response.data;
  },

  saveComparison: async (vehicleAId: number, vehicleBId: number, notes: string): Promise<any> => {
    if (USE_MOCKS) return { id: Date.now() };
    const response = await apiClient.post('/comparisons', {
      vehicleAId,
      vehicleBId,
      notes
    });
    return response.data;
  },

  deleteComparison: async (id: number): Promise<void> => {
    if (USE_MOCKS) return;
    await apiClient.delete(`/comparisons/${id}`);
  },

  detectProfile: async (params: SearchParams): Promise<CustomerProfile> => {
    if (USE_MOCKS) {
      await delay(200);
      return buildMockProfile(params);
    }
    try {
      const response = await apiClient.post('/profiles/detect', {
        brand: params.brand,
        model: params.model,
        version: params.version,
        attributes: params.attributes || [],
      });
      return adaptCustomerProfile(response.data);
    } catch (error) {
      // Sem rede: usa a heurística local para não deixar a tela vazia.
      console.warn('detectProfile falhou, usando heurística local', error);
      return buildMockProfile(params);
    }
  }
};