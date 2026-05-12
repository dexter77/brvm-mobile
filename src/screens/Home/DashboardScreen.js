import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { useAtom } from 'jotai';
import apiClient from '../../api/client';
import { userAtom, walletAtom } from '../../stores/authStore';

const DashboardScreen = ({ navigation }) => {
  const [user] = useAtom(userAtom);
  const [wallet, setWallet] = useAtom(walletAtom);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await apiClient.get('/wallet/');
      setWallet(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.name}>{user?.first_name || 'Utilisateur'}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.first_name?.charAt(0) || 'U'}</Text>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde Total</Text>
        <Text style={styles.balanceAmount}>
          ${parseFloat(wallet?.balance || 0).toFixed(2)}
        </Text>
        <Text style={styles.currency}>{wallet?.currency || 'USD'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Actions Rapides</Text>
      <View style={styles.grid}>
        {[
          { icon: '📈', label: 'Investissements', screen: 'Investments' },
          { icon: '💸', label: 'Transactions', screen: 'Transactions' },
          { icon: '💳', label: 'Portefeuille', screen: 'Wallet' },
          { icon: '➕', label: 'Ajouter fonds', screen: 'AddFunds' },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>{item.icon}</Text>
            <Text style={styles.actionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 24 },
  greeting: { color: '#94a3b8', fontSize: 14 },
  name: { color: '#f1f5f9', fontSize: 22, fontWeight: 'bold' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#38bdf8', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },
  balanceCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, marginBottom: 28, borderWidth: 1, borderColor: '#334155' },
  balanceLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  balanceAmount: { color: '#38bdf8', fontSize: 40, fontWeight: 'bold', marginBottom: 4 },
  currency: { color: '#64748b', fontSize: 12 },
  sectionTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionBtn: { width: '48%', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '500' },
});

export default DashboardScreen;
