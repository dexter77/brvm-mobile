import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '../src/api/client';
import { useTheme } from '../src/context/ThemeContext';
import * as Haptics from 'expo-haptics';

type MarketData = {
  symbol: string;
  name: string;
  close: string;
  variation: string;
  buy_volume: number | null;
  sell_volume: number | null;
};

export default function OrderBookScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState<MarketData[]>([]);

  const fetchData = async () => {
    try {
      const response = await apiClient.get('/investments/market/');
      // Filter out indices
      const filtered = (response.data || []).filter((item: any) => 
        !['BRVMC', 'BRVM30', 'BRVMP'].includes(item.symbol)
      );
      setMarketData(filtered);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredData = useMemo(() => {
    return marketData.filter(
      item =>
        item.symbol.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, marketData]);

  const getTrend = (buy: number | null, sell: number | null) => {
    const b = buy || 0;
    const s = sell || 0;
    
    if (b === 0 && s === 0) return { label: 'Stable', icon: '↔️', color: '#94a3b8' };
    if (b > s * 2) return { label: 'Forte Hausse', icon: '🚀', color: '#10b981' };
    if (b > s) return { label: 'Hausse', icon: '📈', color: '#10b981' };
    if (s > b * 2) return { label: 'Forte Baisse', icon: '📉', color: '#ff5252' };
    if (s > b) return { label: 'Baisse', icon: '📉', color: '#ff5252' };
    return { label: 'Stable', icon: '↔️', color: '#94a3b8' };
  };

  const renderItem = ({ item }: { item: MarketData }) => {
    const trend = getTrend(item.buy_volume, item.sell_volume);
    
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/company/${item.symbol}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.symbol, { color: colors.primary }]}>{item.symbol}</Text>
            <Text style={[styles.companyName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <View style={[styles.trendBadge, { backgroundColor: trend.color + '15' }]}>
            <Text style={[styles.trendText, { color: trend.color }]}>
              {trend.icon} {trend.label}
            </Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.label}>Cours Clôture</Text>
            <Text style={[styles.price, { color: colors.text }]}>
              {parseFloat(item.close).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Variation</Text>
            <Text style={[styles.variation, { color: parseFloat(item.variation) >= 0 ? '#10b981' : '#ff5252' }]}>
              {parseFloat(item.variation) >= 0 ? '+' : ''}{item.variation}%
            </Text>
          </View>
        </View>

        <View style={styles.volumesContainer}>
          <View style={styles.volumeBox}>
            <Text style={[styles.volumeLabel, { color: '#10b981' }]}>ACHAT (Demande)</Text>
            <Text style={[styles.volumeValue, { color: colors.text }]}>
              {(item.buy_volume || 0).toLocaleString('fr-FR')}
            </Text>
            <View style={styles.progressBg}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: '#10b981', 
                    width: `${Math.min(100, ((item.buy_volume || 0) / ((item.buy_volume || 0) + (item.sell_volume || 1))) * 100)}%` 
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.volumeBox}>
            <Text style={[styles.volumeLabel, { color: '#ff5252' }]}>VENTE (Offre)</Text>
            <Text style={[styles.volumeValue, { color: colors.text, textAlign: 'right' }]}>
              {(item.sell_volume || 0).toLocaleString('fr-FR')}
            </Text>
            <View style={[styles.progressBg, { alignItems: 'flex-end' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: '#ff5252', 
                    width: `${Math.min(100, ((item.sell_volume || 0) / ((item.buy_volume || 0) + (item.sell_volume || 1))) * 100)}%` 
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Carnet d'ordre</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="Rechercher une action..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={[styles.disclaimer, { backgroundColor: colors.card + '80', borderColor: colors.border }]}>
        <Ionicons name="alert-circle-outline" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
        <Text style={[styles.disclaimerText, { color: colors.subtext }]}>
          Attention : Ces tendances sont des prévisions basées sur les volumes résiduels. Ceci ne constitue pas un conseil en investissement. Faites vos propres analyses.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={item => item.symbol}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucune action trouvée</Text>
            </View>
          }
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    top: 12,
    zIndex: 1,
  },
  searchInput: {
    height: 45,
    borderRadius: 12,
    paddingLeft: 45,
    paddingRight: 16,
    borderWidth: 1,
  },
  disclaimer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 14,
    color: '#64748b',
    maxWidth: 200,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  variation: {
    fontSize: 16,
    fontWeight: '700',
  },
  volumesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  volumeBox: {
    flex: 0.48,
  },
  volumeLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
});
