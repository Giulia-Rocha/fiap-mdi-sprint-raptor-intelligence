import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Vehicle, SearchParams } from '../types/vehicle';

interface VehicleContextType {
  currentSearchParams: SearchParams | null;
  setSearchParams: (params: SearchParams) => void;
  comparisonList: Vehicle[];
  addToComparison: (vehicle: Vehicle) => void;
  removeFromComparison: (vehicleId: number) => void;
  clearComparison: () => void;
  isInComparison: (vehicleId: number) => boolean;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSearchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [comparisonList, setComparisonList] = useState<Vehicle[]>([]);

  const addToComparison = (vehicle: Vehicle) => {
    setComparisonList(prev => {
      if (prev.find(v => v.id === vehicle.id)) return prev;
      if (prev.length >= 2) {
        alert("O veículo mais antigo foi removido da comparação.");
        return [prev[1], vehicle]; // Keep max 2, replace oldest
      }
      return [...prev, vehicle];
    });
  };

  const removeFromComparison = (vehicleId: number) => {
    setComparisonList(prev => prev.filter(v => v.id !== vehicleId));
  };

  const clearComparison = () => {
    setComparisonList([]);
  };

  const isInComparison = (vehicleId: number) => {
    return !!comparisonList.find(v => v.id === vehicleId);
  };

  return (
    <VehicleContext.Provider value={{
      currentSearchParams,
      setSearchParams,
      comparisonList,
      addToComparison,
      removeFromComparison,
      clearComparison,
      isInComparison
    }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = () => {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
};
