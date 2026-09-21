import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useVehicle } from '../../context/VehicleContext';
import { specsApi } from '../../services/specsApi';
import { ProfileBadge } from '../../components/molecules/ProfileBadge';
import { ArgumentCard } from '../../components/molecules/ArgumentCard';
import { SkeletonBar } from '../../components/atoms/SkeletonBar';
import { CustomerProfile } from '../../types/profile';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const { currentSearchParams } = useVehicle();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock profile detection based on current state
      const data = await specsApi.detectProfile(
        currentSearchParams || { brand: '', model: '', version: '', attributes: [] }
      );
      setProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentSearchParams]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={{ padding: 20 }}>
          <SkeletonBar height={150} style={{ marginBottom: 20 }} />
          <SkeletonBar height={100} style={{ marginBottom: 20 }} />
          <SkeletonBar height={60} style={{ marginBottom: 10 }} />
          <SkeletonBar height={60} style={{ marginBottom: 10 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.displayMd, { color: colors.textPrimary }]}>Perfil do Cliente</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <Text style={[typography.labelSm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            PERFIL IDENTIFICADO
          </Text>
          <ProfileBadge type={profile.type} />
          <Text style={[typography.bodyMd, { color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' }]}>
            {profile.description}
          </Text>
        </View>

        <View style={styles.signalsSection}>
          <Text style={[typography.labelSm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            SINAIS DE DETECÇÃO
          </Text>
          <View style={[styles.signalsContainer, { backgroundColor: colors.bgSurface, borderRadius: radius.md }]}>
            {profile.detectedSignals.map((signal, index) => (
              <View key={index} style={[styles.signalRow, { borderBottomColor: index === profile.detectedSignals.length - 1 ? 'transparent' : colors.borderSubtle }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accentTeal} style={{ marginRight: spacing.sm }} />
                <Text style={[typography.bodySm, { color: colors.textPrimary }]}>{signal}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.argumentsSection}>
          <Text style={[typography.labelSm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            ARGUMENTOS DE VENDA SUGERIDOS
          </Text>
          {profile.salesArguments.map(arg => (
            <ArgumentCard 
              key={arg.id}
              title={arg.title}
              description={arg.description}
              urgency={arg.urgency}
            />
          ))}
        </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  signalsSection: {
    marginBottom: 32,
  },
  signalsContainer: {
    padding: 16,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  argumentsSection: {
    marginBottom: 20,
  }
});
