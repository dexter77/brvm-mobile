import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Alert, Platform, Image,
  TextInput, Modal, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';

type WatchlistItem = { id: number; symbol: string; added_at: string };
type MarketData = Record<string, { name: string; close: string; previous_close: string; variation: string; logo_url: string }>;

export default function WatchlistDetailScreen() {
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [watchlist, setWatchlist] = useState<any>(null);
  const [market, setMarket] = useState<MarketData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    try {
      const [wlRes, mktRes] = await Promise.all([
        apiClient.get(`/watchlists/${id}/`),
        apiClient.get('/investments/market/'),
      ]);
      setWatchlist(wlRes.data);
      setNewName(wlRes.data.name);
      const mktMap: MarketData = {};
      for (const item of mktRes.data || []) {
        mktMap[item.symbol] = item;
      }
      setMarket(mktMap);
    } catch (e) {
      console.error('WatchlistDetail load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRenameList = async () => {
    if (!newName.trim()) return;
    try {
      await apiClient.patch(`/watchlists/${id}/`, { name: newName.trim() });
      setEditModalVisible(false);
      load();
    } catch {
      Alert.alert('Erreur', 'Impossible de renommer la liste.');
    }
  };

  const handleDeleteList = () => {
    Alert.alert(
      'Supprimer la liste',
      `Êtes-vous sûr de vouloir supprimer "${watchlist?.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/watchlists/${id}/`);
              router.back();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la liste.');
            }
          },
        },
      ]
    );
  };

  const handleRemove = async (symbol: string) => {
    Alert.alert(
      'Retirer de la liste',
      `Supprimer ${symbol} de "${watchlist?.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post(`/watchlists/${id}/remove_item/`, { symbol });
              load();
            } catch {
              Alert.alert('Erreur', 'Impossible de retirer ce titre.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: WatchlistItem }) => {
    const mkt = market[item.symbol];
    const close = mkt ? parseFloat(mkt.close) : null;
    const variation = mkt ? parseFloat(mkt.variation) : null;
    const isPositive = variation !== null && variation > 0;
    const isNegative = variation !== null && variation < 0;
    const varColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#64748b';
    const varPrefix = isPositive ? '+' : '';

    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => router.push(`/company/${item.symbol}` as any)}
        onLongPress={() => handleRemove(item.symbol)}
      >
        <View style={styles.logoBox}>
          {mkt?.logo_url ? (
            <Image 
              source={{ uri: mkt.logo_url }} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          ) : (
            <Text style={styles.logoText}>{item.symbol.charAt(0)}</Text>
          )}
        </View>

        <View style={styles.itemBody}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
            {mkt?.name || item.symbol}
          </Text>
          <Text style={[styles.itemSymbol, { color: colors.subtext }]}>{item.symbol}</Text>
        </View>

        <View style={styles.itemRight}>
          {close !== null ? (
            <>
              <Text style={[styles.itemPrice, { color: colors.text }]}>
                {close.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text style={[styles.itemVar, { color: varColor }]}>
                {variation !== null ? `${varPrefix}${variation.toFixed(2)}%` : '—'}
              </Text>
            </>
          ) : (
            <Text style={[styles.itemPrice, { color: colors.subtext }]}>—</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{watchlist?.name}</Text>
          <Text style={[styles.headerSub, { color: colors.subtext }]}>
            {watchlist?.items?.length || 0} titre{(watchlist?.items?.length || 0) > 1 ? 's' : ''} suivis
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Options de la liste',
              'Que souhaitez-vous faire ?',
              [
                { text: 'Renommer la liste', onPress: () => setEditModalVisible(true) },
                { text: 'Supprimer la liste', style: 'destructive', onPress: handleDeleteList },
                { text: 'Annuler', style: 'cancel' },
              ]
            );
          }}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {watchlist?.items?.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>👁</Text>
          <Text style={styles.emptyText}>Cette liste est vide</Text>
          <Text style={styles.emptySub}>
            Depuis la fiche d'une action, cliquez sur "Suivre" pour l'ajouter ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={watchlist?.items || []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const mkt = market[item.symbol];
            const close = mkt ? parseFloat(mkt.close) : null;
            const variation = mkt ? parseFloat(mkt.variation) : null;
            const isPositive = variation !== null && variation > 0;
            const isNegative = variation !== null && variation < 0;
            const varColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#64748b';
            const varPrefix = isPositive ? '+' : '';

            return (
              <View style={[styles.itemCardContainer, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.itemCard, { flex: 1 }]}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/company/${item.symbol}` as any)}
                >
                  <View style={styles.logoBox}>
                    {mkt?.logo_url ? (
                      <Image source={{ uri: mkt.logo_url }} style={styles.logoImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.logoText}>{item.symbol.charAt(0)}</Text>
                    )}
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{mkt?.name || item.symbol}</Text>
                    <Text style={[styles.itemSymbol, { color: colors.subtext }]}>{item.symbol}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    {close !== null ? (
                      <>
                        <Text style={[styles.itemPrice, { color: colors.text }]}>{close.toLocaleString('fr-FR')} FCFA</Text>
                        <Text style={[styles.itemVar, { color: varColor }]}>{variation !== null ? `${varPrefix}${variation.toFixed(2)}%` : '—'}</Text>
                      </>
                    ) : (
                      <Text style={[styles.itemPrice, { color: colors.subtext }]}>—</Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleRemove(item.symbol)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Rename Modal */}
      <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Renommer la liste</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleRenameList}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtn} onPress={() => setEditModalVisible(false)}>
                  <Text style={{ color: colors.subtext, fontWeight: '600' }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleRenameList}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  logoText: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '800',
  },
  itemBody: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  itemSymbol: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  itemVar: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef444415',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBox: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
