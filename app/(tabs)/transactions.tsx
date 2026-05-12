import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';

type Transaction = {
  id: number;
  transaction_type: string;
  status: string;
  amount: string;
  currency: string;
  description: string;
  reference_number: string;
  fee: string;
  created_at: string;
  portfolio_name?: string;
};

const TYPE_CONFIG: any = {
  DEPOSIT: { icon: '⬇️', label: 'Dépôt', color: '#10b981' },
  WITHDRAWAL: { icon: '⬆️', label: 'Retrait', color: '#ef4444' },
  TRANSFER: { icon: '↔️', label: 'Transfert', color: '#38bdf8' },
  INVESTMENT: { icon: '📈', label: 'Investissement', color: '#a78bfa' },
  DIVIDEND: { icon: '💰', label: 'Dividende', color: '#f59e0b' },
};

const STATUS_CONFIG: any = {
  COMPLETED: { label: 'Complétée', color: '#10b981' },
  PENDING: { label: 'En attente', color: '#f59e0b' },
  FAILED: { label: 'Échouée', color: '#ef4444' },
  CANCELLED: { label: 'Annulée', color: '#64748b' },
};

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | string>('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Form
  const [txType, setTxType] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'INVESTMENT'>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [txRes, summaryRes] = await Promise.all([
        apiClient.get('/transactions/'),
        apiClient.get('/transactions/summary/'),
      ]);
      setTransactions(txRes.data?.results || txRes.data || []);
      setSummary(summaryRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/transactions/', {
        transaction_type: txType,
        amount: parseFloat(amount),
        currency: 'XOF',
        description: description || `${TYPE_CONFIG[txType].label} - BRVM`,
      });
      Alert.alert('✅ Succès', 'Transaction enregistrée !');
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', "Impossible d'enregistrer la transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setTxType('DEPOSIT');
  };

  const filteredTx =
    filterType === 'ALL'
      ? transactions
      : transactions.filter((t) => t.transaction_type === filterType);

  const formatAmount = (amountStr: string, type: string) => {
    const val = parseFloat(amountStr || '0').toLocaleString('fr-FR');
    const sign = ['DEPOSIT', 'DIVIDEND'].includes(type) ? '+' : '-';
    return `${sign}${val} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#38bdf8"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>💸 Transactions</Text>
            <TouchableOpacity 
              style={styles.supportBtn} 
              onPress={() => {
                Alert.alert(
                  'Contactez-nous',
                  'Comment préférez-vous nous contacter ?',
                  [
                    {
                      text: '📧 Par Email',
                      onPress: () => Linking.openURL('mailto:support@bedoumagique.com'),
                    },
                    {
                      text: '💬 Par WhatsApp',
                      onPress: () => Linking.openURL('https://wa.me/2250789111160'),
                    },
                    {
                      text: 'Annuler',
                      style: 'cancel',
                    },
                  ]
                );
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#f1f5f9" />
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.summaryRow}
          >
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>📊</Text>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>
                {summary?.total_transactions || 0}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>⬇️</Text>
              <Text style={styles.summaryLabel}>Dépôts</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                {parseFloat(summary?.total_deposits || 0).toLocaleString(
                  'fr-FR'
                )}{' '}
                FCFA
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>⬆️</Text>
              <Text style={styles.summaryLabel}>Retraits</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                {parseFloat(summary?.total_withdrawals || 0).toLocaleString(
                  'fr-FR'
                )}{' '}
                FCFA
              </Text>
            </View>
          </ScrollView>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
          >
            {[
              'ALL',
              'DEPOSIT',
              'WITHDRAWAL',
              'TRANSFER',
              'INVESTMENT',
              'DIVIDEND',
            ].map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterBtn,
                  filterType === f && styles.filterBtnActive,
                ]}
                onPress={() => setFilterType(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filterType === f && styles.filterTextActive,
                  ]}
                >
                  {f === 'ALL'
                    ? '🔍 Tout'
                    : `${TYPE_CONFIG[f]?.icon} ${TYPE_CONFIG[f]?.label}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Liste transactions */}
          <View style={styles.list}>
            {filteredTx.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Aucune transaction</Text>
                <Text style={styles.emptySubtext}>
                  Appuyez sur "+ Nouvelle" pour commencer
                </Text>
              </View>
            ) : (
              filteredTx.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txCard}
                  onPress={() => setSelectedTransaction(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBox,
                        {
                          backgroundColor:
                            TYPE_CONFIG[tx.transaction_type]?.color + '20',
                        },
                      ]}
                    >
                      <Text style={styles.txIcon}>
                        {TYPE_CONFIG[tx.transaction_type]?.icon || '💳'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.txType}>
                        {TYPE_CONFIG[tx.transaction_type]?.label}
                      </Text>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description || tx.reference_number}
                      </Text>
                      <Text style={styles.txDate}>
                        {formatDate(tx.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        {
                          color: ['DEPOSIT', 'DIVIDEND'].includes(
                            tx.transaction_type
                          )
                            ? '#10b981'
                            : '#ef4444',
                        },
                      ]}
                    >
                      {formatAmount(tx.amount, tx.transaction_type)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            STATUS_CONFIG[tx.status]?.color + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: STATUS_CONFIG[tx.status]?.color },
                        ]}
                      >
                        {STATUS_CONFIG[tx.status]?.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {/* Modal Nouvelle Transaction */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setModalVisible(false);
            resetForm();
          }}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>💸 Nouvelle Transaction</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(false);
                        resetForm();
                      }}
                    >
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Type selector */}
                  <Text style={styles.label}>Type de transaction</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.typeRow}
                  >
                    {['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'INVESTMENT'].map(
                      (t) => (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.typeBtn,
                            txType === t && styles.typeBtnActive,
                          ]}
                          onPress={() =>
                            setTxType(
                              t as 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'INVESTMENT'
                            )
                          }
                        >
                          <Text style={styles.typeBtnIcon}>
                            {TYPE_CONFIG[t].icon}
                          </Text>
                          <Text
                            style={[
                              styles.typeBtnText,
                              txType === t && styles.typeBtnTextActive,
                            ]}
                          >
                            {TYPE_CONFIG[t].label}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </ScrollView>

                  <Text style={styles.label}>Montant (FCFA)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="ex: 50000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    returnKeyType="done"
                    autoFocus
                    onSubmitEditing={handleAddTransaction}
                  />

                  <Text style={styles.label}>Description (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="ex: Achat actions Sonatel"
                    placeholderTextColor="#64748b"
                  />

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      submitting && styles.submitBtnDisabled,
                    ]}
                    onPress={handleAddTransaction}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#0f172a" />
                    ) : (
                      <Text style={styles.submitBtnText}>✅ Enregistrer</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        {/* Modal Détail Transaction */}
        <Modal
          visible={!!selectedTransaction}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedTransaction(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: 40 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📄 Détail de l'opération</Text>
                <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedTransaction && (
                <View>
                  <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <View style={{ 
                      width: 60, height: 60, borderRadius: 30, 
                      backgroundColor: TYPE_CONFIG[selectedTransaction.transaction_type]?.color + '20',
                      justifyContent: 'center', alignItems: 'center', marginBottom: 12
                    }}>
                      <Text style={{ fontSize: 30 }}>{TYPE_CONFIG[selectedTransaction.transaction_type]?.icon}</Text>
                    </View>
                    <Text style={{ color: '#f1f5f9', fontSize: 24, fontWeight: '800' }}>
                      {parseFloat(selectedTransaction.amount).toLocaleString('fr-FR')} FCFA
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
                      {TYPE_CONFIG[selectedTransaction.transaction_type]?.label}
                    </Text>
                  </View>

                  <View style={styles.detailList}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Statut</Text>
                      <View style={{ 
                        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, 
                        backgroundColor: STATUS_CONFIG[selectedTransaction.status]?.color + '20' 
                      }}>
                        <Text style={{ color: STATUS_CONFIG[selectedTransaction.status]?.color, fontWeight: '700', fontSize: 12 }}>
                          {STATUS_CONFIG[selectedTransaction.status]?.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Compte Bedou</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.portfolio_name || 'Principal'}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{new Date(selectedTransaction.created_at).toLocaleString('fr-FR')}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Référence</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.reference_number}</Text>
                    </View>

                    {selectedTransaction.description && (
                      <View style={[styles.detailItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={[styles.detailValue, { marginTop: 4, color: '#94a3b8' }]}>
                          {selectedTransaction.description}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#38bdf8', marginTop: 30 }]}
                    onPress={() => setSelectedTransaction(null)}
                  >
                    <Text style={styles.submitBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  supportBtn: {
    padding: 8,
    borderRadius: 12,
  },
  summaryRow: { paddingLeft: 16, marginBottom: 12 },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    minWidth: 130,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryIcon: { fontSize: 20, marginBottom: 6 },
  summaryLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  summaryValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  filterRow: { paddingLeft: 16, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
    backgroundColor: '#1e293b',
  },
  filterBtnActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  filterText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#0f172a' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#cbd5e1', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#64748b', fontSize: 13, marginTop: 4 },
  txCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txIcon: { fontSize: 20 },
  txType: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  txDesc: { color: '#64748b', fontSize: 12, marginTop: 2, maxWidth: 150 },
  txDate: { color: '#475569', fontSize: 11, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  detailList: { marginTop: 10 },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailLabel: { color: '#94a3b8', fontSize: 14 },
  detailValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  closeBtn: { color: '#94a3b8', fontSize: 20 },
  label: { color: '#94a3b8', fontSize: 12, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 14,
  },
  typeRow: { flexDirection: 'row', marginBottom: 4 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  typeBtnIcon: { fontSize: 18, marginBottom: 4 },
  typeBtnText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  typeBtnTextActive: { color: '#0f172a' },
  submitBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
});
