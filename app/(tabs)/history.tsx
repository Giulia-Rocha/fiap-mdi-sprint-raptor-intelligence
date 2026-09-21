import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { storageService } from '../../services/storageService';
import { VehicleCard } from '../../components/molecules/VehicleCard';
import { FilterChip } from '../../components/atoms/FilterChip';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
  const { colors, typography, spacing } = useTheme();
  const [history, setHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const hist = await storageService.getHistory();
    const favs = await storageService.getFavorites();
    setHistory(hist);
    setFavorites(favs);
  };

  const toggleFavorite = async (id: number) => {
    await storageService.toggleFavorite(id);
    loadData();
  };

  const handleClearHistory = async () => {
    Alert.alert(
      "Limpar Histórico",
      "Deseja apagar todo o seu histórico de buscas?",
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

  const filteredHistory = history.filter((item: any) => {
    if (filter === 'fav') return favorites.includes(item.id);
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={[typography.displayMd, { color: colors.textPrimary }]}>Histórico</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={24} color={colors.accentRed} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterSection}>
        <FilterChip 
          label="Todos" 
          selected={filter === 'all'} 
          onPress={() => setFilter('all')}
          style={{ marginRight: spacing.sm }}
        />
        <FilterChip 
          label="Favoritos" 
          selected={filter === 'fav'} 
          onPress={() => setFilter('fav')} 
        />
      </View>

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={colors.textMuted} />
          <Text style={[typography.bodyMd, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Nenhuma busca encontrada
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <TouchableOpacity 
                style={{ flex: 1 }}
                onPress={() => router.push(`/screens/specs/${item.id}`)}
              >
                <VehicleCard 
                  brand={item.brand}
                  model={item.model}
                  version={item.version}
                  year={item.year}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.favButton}
                onPress={() => toggleFavorite(item.id)}
              >
                <Ionicons 
                  name={favorites.includes(item.id) ? "bookmark" : "bookmark-outline"} 
                  size={24} 
                  color={favorites.includes(item.id) ? colors.accentAmber : colors.textMuted} 
                />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterSection: {
    flexDirection: 'row',
    padding: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  favButton: {
    padding: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});