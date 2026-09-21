import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { useSpecs } from '../../../hooks/useSpecs';
import { useVehicle } from '../../../context/VehicleContext';
import { SpecSection } from '../../../components/organisms/SpecSection';
import { SpecRow } from '../../../components/molecules/SpecRow';
import { SkeletonBar } from '../../../components/atoms/SkeletonBar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TechnicalSheet } from '../../../types/specs';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const escapeHtml = (text: string | null | undefined): string =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default function SpecsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, radius } = useTheme();
  const { getSpecs, isLoading } = useSpecs();
  const { addToComparison, isInComparison } = useVehicle();
  const router = useRouter();

  const [sheet, setSheet] = useState<TechnicalSheet | null>(null);

  const loadData = useCallback(async () => {
    const data = await getSpecs(Number(id));
    if (data) {
      setSheet(data);
    }
  }, [id, getSpecs]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  const handleShare = async () => {
    if (!sheet) return;
    try {
      const html = `
        <html>
          <body style="font-family: sans-serif; padding: 20px;">
            <h1 style="color: ${colors.accentBlue}">${escapeHtml(sheet.vehicle.brand)} ${escapeHtml(sheet.vehicle.model)}</h1>
            <h2>${escapeHtml(sheet.vehicle.version)} (${sheet.vehicle.year})</h2>
            <hr />
            ${sheet.specs.map(s => `
              <div style="margin-bottom: 10px;">
                <b style="text-transform: capitalize;">${escapeHtml(s.label)}:</b> ${escapeHtml(s.value)} ${escapeHtml(s.unit) || ''}
              </div>
            `).join('')}
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF');
    }
  };

  if (isLoading || !sheet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={{ padding: 20 }}>
          <SkeletonBar height={200} style={{ marginBottom: 20 }} />
          <SkeletonBar height={40} style={{ marginBottom: 20 }} />
          <SkeletonBar height={60} style={{ marginBottom: 10 }} />
          <SkeletonBar height={60} style={{ marginBottom: 10 }} />
          <SkeletonBar height={60} style={{ marginBottom: 10 }} />
        </View>
      </SafeAreaView>
    );
  }

  const categories = Array.from(new Set(sheet.specs.map(s => s.category)));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.displayMd, { color: colors.textPrimary }]}>Ficha Técnica</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerCard, { backgroundColor: colors.accentBlue, borderRadius: radius.lg }]}>
          <Text style={[typography.displayLg, { color: 'white' }]}>
            {sheet.vehicle.brand} {sheet.vehicle.model}
          </Text>
          <Text style={[typography.displayMd, { color: 'rgba(255,255,255,0.8)' }]}>
            {sheet.vehicle.version} • {sheet.vehicle.year}
          </Text>
        </View>

        <View style={styles.specContent}>
          {categories.map((cat) => (
            <SpecSection key={cat} title={cat}>
              {sheet.specs
                .filter(s => s.category === cat)
                .map((spec, index, arr) => (
                  <SpecRow 
                    key={spec.id}
                    label={spec.label}
                    value={spec.value}
                    showDivider={index < arr.length - 1}
                  />
                ))
              }
            </SpecSection>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle }]}>
        <TouchableOpacity 
          style={[styles.compareButton, { backgroundColor: colors.accentBlue, borderRadius: radius.md }]}
          onPress={() => {
            if (isInComparison(sheet.vehicle.id)) {
              router.push('/(tabs)/compare');
            } else {
              addToComparison(sheet.vehicle);
              alert('Veículo adicionado ao comparativo!');
            }
          }}
        >
          <Text style={[typography.bodyMd, { color: 'white', fontWeight: '700' }]}>
            {isInComparison(sheet.vehicle.id) ? 'Ver no comparativo' : 'Adicionar no comparativo'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
    padding: 24,
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
  },
  specContent: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  compareButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
