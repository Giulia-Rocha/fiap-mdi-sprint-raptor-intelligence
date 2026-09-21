import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryItem, StorageSchemaV1 } from '../types/storage';

const KEYS = {
  SEARCH_HISTORY: '@raptor/search_history_v1',
  FAVORITES: '@raptor/favorites',
  SETTINGS: '@raptor/settings',
};

export const storageService = {
  saveSearch: async (vehicle: Omit<SearchHistoryItem, 'createdAt'>) => {
    try {
      const history = await storageService.getHistory();
      const newItem: SearchHistoryItem = {
        ...vehicle,
        createdAt: new Date().toISOString()
      };
      const updated = [newItem, ...history.filter(v => v.id !== vehicle.id)].slice(0, 10);
      
      const schema: StorageSchemaV1 = {
        version: 1,
        searches: updated
      };
      
      await AsyncStorage.setItem(KEYS.SEARCH_HISTORY, JSON.stringify(schema));
    } catch (e) {
      console.error('Error saving search history', e);
    }
  },

  getHistory: async (): Promise<SearchHistoryItem[]> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.SEARCH_HISTORY);
      if (!data) return [];
      
      const parsed = JSON.parse(data) as StorageSchemaV1;
      if (parsed.version === 1 && Array.isArray(parsed.searches)) {
        return parsed.searches;
      }
      return [];
    } catch (e) {
      return [];
    }
  },

  clearHistory: async () => {
    try {
      await AsyncStorage.removeItem(KEYS.SEARCH_HISTORY);
    } catch (e) {
      console.error('Error clearing search history', e);
    }
  },

  toggleFavorite: async (vehicleId: number) => {
    try {
      const favorites = await storageService.getFavorites();
      const isFavorite = favorites.includes(vehicleId);
      const updated = isFavorite
        ? favorites.filter((id: number) => id !== vehicleId)
        : [...favorites, vehicleId];
      await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
      return !isFavorite;
    } catch (e) {
      return false;
    }
  },

  getFavorites: async (): Promise<number[]> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveSettings: async (settings: any) => {
    try {
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  },

  getSettings: async () => {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
};