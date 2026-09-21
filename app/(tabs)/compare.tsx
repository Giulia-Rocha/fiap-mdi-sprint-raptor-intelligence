import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useVehicle } from '../../context/VehicleContext';
import { specsApi } from '../../services/specsApi';
import { CompareMatrix } from '../../components/organisms/CompareMatrix';
import { RadarChart } from '../../components/organisms/RadarChart';
import { SkeletonBar } from '../../components/atoms/SkeletonBar';
import { ComparisonMatrix } from '../../types/specs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { buildConclusion } from '../../utils/conclusion';

export default function CompareScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const { comparisonList, clearComparison } = useVehicle();
  const [matrix, setMatrix] = useState<ComparisonMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const loadMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await specsApi.compareVehicles(comparisonList.map(v => v.id));
      setMatrix(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [comparisonList]);

  useEffect(() => {
    if (comparisonList.length > 0) {
      loadMatrix();
    } else {
      setMatrix(null);
    }
  }, [comparisonList, loadMatrix]);

  const handleSaveComparison = async () => {
    if (comparisonList.length < 2) return;
    try {
      await specsApi.saveComparison(
        comparisonList[0].id,
        comparisonList[1].id,
        `Comparativo entre ${comparisonList[0].model} e ${comparisonList[1].model}`
      );
      alert('Comparativo salvo com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar comparativo.');
    }
  };

  if (comparisonList.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.emptyState}>
          <Ionicons name="git-compare-outline" size={80} color={colors.textMuted} />
          <Text style={[typography.displayMd, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            Nenhum veículo para comparar
          </Text>
          <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: 40 }]}>
            Selecione até dois veículos na ficha técnica para ver o comparativo detalhado.
          </Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.accentBlue, borderRadius: radius.md, marginTop: spacing.xl }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[typography.bodyMd, { color: 'white' }]}>Buscar veículos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Text style={[typography.displayMd, { color: colors.textPrimary }]}>Comparativo</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={handleSaveComparison} disabled={comparisonList.length < 2}>
            <Ionicons name="save-outline" size={24} color={comparisonList.length < 2 ? colors.textMuted : colors.accentTeal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearComparison}>
            <Text style={[typography.bodySm, { color: colors.accentRed }]}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.vehicleHeaders}>
          {comparisonList.map((v, i) => (
            <View 
              key={v.id} 
              style={[
                styles.vehicleHeader, 
                { 
                  backgroundColor: i === 0 ? colors.accentBlue : colors.bgElevated,
                  borderRadius: radius.md,
                }
              ]}
            >
              <Text style={[typography.labelSm, { color: 'white' }]} numberOfLines={1}>{v.brand}</Text>
              <Text style={[typography.bodyMd, { color: 'white', fontWeight: '700' }]} numberOfLines={1}>{v.model}</Text>
              <Text style={[typography.bodySm, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{v.version}</Text>
            </View>
          ))}
          {comparisonList.length === 1 && (
            <TouchableOpacity 
              style={[styles.addVehicle, { borderColor: colors.borderSubtle, borderRadius: radius.md }]}
              onPress={() => router.push('/(tabs)')}
            >
              <Ionicons name="add" size={24} color={colors.textSecondary} />
              <Text style={[typography.bodySm, { color: colors.textSecondary }]}>Adicionar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={{ marginTop: 24 }}>
            <SkeletonBar height={300} style={{ marginBottom: 20 }} />
            <SkeletonBar height={100} />
          </View>
        ) : matrix ? (
          <>
            <View style={styles.chartSection}>
              <Text style={[typography.labelSm, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                ANÁLISE DE PERFORMANCE
              </Text>
              <RadarChart 
                data={matrix.scores.map(s => {
                  const vehicle = matrix.vehicles.find(v => v.id === s.vehicleId);
                  return {
                    label: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Veículo',
                    motor: s.axes.motor,
                    offRoad: s.axes.offRoad,
                    tecnologia: s.axes.tecnologia,
                    preco: s.axes.preco,
                    conforto: s.axes.conforto,
                  };
                })} 
              />
            </View>

            <View style={styles.matrixSection}>
              <CompareMatrix 
                sections={[
                  {
                    title: 'ESPECIFICAÇÕES',
                    rows: matrix.rows.map(row => ({
                      label: row.label,
                      value1: row.values[0],
                      value2: row.values[1],
                      winner: row.winnerId === matrix.vehicles[0]?.id ? 1 : row.winnerId === matrix.vehicles[1]?.id ? 2 : undefined,
                    }))
                  }
                ]} 
              />
            </View>

            {matrix.vehicles.length >= 2 && (
              <View style={[styles.conclusionSection, { backgroundColor: colors.bgSurface, borderRadius: radius.md, padding: spacing.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Ionicons name="bulb-outline" size={20} color={colors.accentBlue} style={{ marginRight: spacing.sm }} />
                  <Text style={[typography.labelSm, { color: colors.accentBlue }]}>CONCLUSÃO COMPARATIVA</Text>
                </View>
                <Text style={[typography.bodyMd, { color: colors.textPrimary, lineHeight: 22 }]}>
                  {buildConclusion(matrix)}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.profileButton, { backgroundColor: colors.bgSurface, borderColor: colors.accentBlue, borderWidth: 1, borderRadius: radius.md, marginTop: spacing.xl }]}
              onPress={() => router.push('/screens/profile')}
            >
              <Ionicons name="sparkles" size={20} color={colors.accentBlue} style={{ marginRight: spacing.sm }} />
              <Text style={[typography.bodyMd, { color: colors.accentBlue }]}>Ver perfil do cliente e argumentos</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    paddingHorizontal: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  vehicleHeaders: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  vehicleHeader: {
    flex: 1,
    padding: 12,
    height: 80,
    justifyContent: 'center',
  },
  addVehicle: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
  },
  chartSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  matrixSection: {
    marginBottom: 32,
  },
  conclusionSection: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  profileButton: {
    flexDirection: 'row',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

