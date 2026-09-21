import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import { useSpecs } from '../../hooks/useSpecs';
import { SearchForm } from '../../components/organisms/SearchForm';
import { BottomSheet } from '../../components/organisms/BottomSheet';
import { VehicleCard } from '../../components/molecules/VehicleCard';
import { storageService } from '../../services/storageService';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findVehicleByParams } from '../../utils/vehicle';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const { user } = useAuth();
  const { setSearchParams } = useVehicle();
  const { 
    brands, 
    models, 
    versions, 
    loadBrands,
    loadModels, 
    loadVersions, 
    getVehicles,
    isLoading: isSpecsLoading,
    error: specsError 
  } = useSpecs();
  const router = useRouter();

  const [history, setHistory] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetType, setSheetType] = useState<'brand' | 'model' | 'version' | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await storageService.getHistory();
    setHistory(data);
  };

  const handleClearHistory = async () => {
    Alert.alert(
      "Limpar Histórico",
      "Deseja apagar todas as buscas recentes?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Limpar", 
          style: "destructive",
          onPress: async () => {
            await storageService.clearHistory();
            setHistory([]);
          }
        }
      ]
    );
  };

  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel('');
    setSelectedVersion('');
    loadModels(brand);
    setSheetVisible(false);
  };

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    setSelectedVersion('');
    loadVersions(selectedBrand, model);
    setSheetVisible(false);
  };

  const handleSelectVersion = (version: string) => {
    setSelectedVersion(version);
    setSheetVisible(false);
  };

  const handleSearch = async () => {
    const params = { 
      brand: selectedBrand, 
      model: selectedModel, 
      version: selectedVersion,
      attributes: []
    };

    // SPEC-002: Persist in context
    setSearchParams(params);

    // SPEC-003: Find vehicle by params to get the deterministic numeric ID (backend)
    const vehicles = await getVehicles();
    const vehicle = findVehicleByParams(vehicles, params);

    if (!vehicle) {
      Alert.alert('Veículo não encontrado', 'Não há um veículo cadastrado com a marca, modelo e versão selecionados.');
      return;
    }

    storageService.saveSearch({ ...vehicle });
    
    router.push(`/screens/specs/${vehicle.id}`);
  };

  const renderSheetContent = () => {
    let data: string[] = [];
    let onSelect: (val: string) => void = () => {};

    if (sheetType === 'brand') {
      data = brands;
      onSelect = handleSelectBrand;
    } else if (sheetType === 'model') {
      data = models;
      onSelect = handleSelectModel;
    } else if (sheetType === 'version') {
      data = versions;
      onSelect = handleSelectVersion;
    }

    if (isSpecsLoading) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      );
    }

    if (specsError && data.length === 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={[typography.bodyMd, { color: colors.accentRed }]}>{specsError}</Text>
          <TouchableOpacity 
            style={{ marginTop: 10 }} 
            onPress={() => loadBrands()}
          >
            <Text style={[typography.bodySm, { color: colors.accentBlue }]}>Tente novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (data.length === 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>Nenhum item encontrado.</Text>
        </View>
      );
    }

    return (
      <View>
        {data.map((item) => (
          <TouchableOpacity 
            key={item}
            style={[styles.sheetItem, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => onSelect(item)}
          >
            <Text style={[typography.bodyMd, { color: colors.textPrimary }]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>Olá, {user?.name.split(' ')[0]}</Text>
            <Text style={[typography.bodySm, { color: colors.textMuted }]}>{user?.dealership}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.accentBlue, borderRadius: radius.full }]}>
            <Text style={[typography.labelSm, { color: 'white' }]}>
              {user?.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        </View>

        <View style={styles.searchSection}>
          <SearchForm 
            selectedBrand={selectedBrand || 'Selecionar marca'}
            selectedModel={selectedModel || 'Selecionar modelo'}
            selectedVersion={selectedVersion || 'Selecionar versão'}
            onSelectBrand={() => { setSheetType('brand'); setSheetVisible(true); }}
            onSelectModel={() => { if (selectedBrand) { setSheetType('model'); setSheetVisible(true); } }}
            onSelectVersion={() => { if (selectedModel) { setSheetType('version'); setSheetVisible(true); } }}
            onSearch={handleSearch}
            isSearchDisabled={!selectedBrand || !selectedModel || !selectedVersion}
          />
        </View>

        {history.length > 0 && (
          <View style={styles.historySection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: spacing.lg }}>
              <Text style={[typography.labelSm, { color: colors.textSecondary, marginBottom: spacing.md, marginLeft: spacing.lg }]}>
                Buscas Recentes
              </Text>
              <TouchableOpacity onPress={handleClearHistory} style={{ marginBottom: spacing.md }}>
                <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={history}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => router.push(`/screens/specs/${item.id}`)}
                  style={{ marginRight: spacing.md }}
                >
                  <VehicleCard 
                    brand={item.brand}
                    model={item.model}
                    version={item.version}
                    year={item.year}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </ScrollView>

      <BottomSheet 
        visible={sheetVisible} 
        onClose={() => setSheetVisible(false)}
        title={sheetType === 'brand' ? 'Marca' : sheetType === 'model' ? 'Modelo' : 'Versão'}
      >
        {renderSheetContent()}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  historySection: {
    marginTop: 32,
  },
  sheetItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  }
});