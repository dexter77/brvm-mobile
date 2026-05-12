import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';

type Transaction = {
  id: number;
  transaction_type: string;
  status: string;
  amount: string;
  currency: string;
  description: string;
  reference_number: string;
  fee: string;
  portfolio_name: string;
  created_at: string;
};

const TYPE_CONFIG: any = {
  DEPOSIT: { icon: '⬇️', label: 'Dépôt', color: '#10b981' },
  WITHDRAWAL: { icon: '⬆️', label: 'Retrait', color: '#ff5252' },
  TRANSFER: { icon: '↔️', label: 'Transfert', color: '#38bdf8' },
  INVESTMENT: { icon: '📈', label: 'Investissement', color: '#a78bfa' },
  DIVIDEND: { icon: '💰', label: 'Dividende', color: '#f59e0b' },
};

const STATUS_CONFIG: any = {
  COMPLETED: { label: 'Complétée', color: '#10b981' },
  PENDING: { label: 'En attente', color: '#f59e0b' },
  FAILED: { label: 'Échouée', color: '#ff5252' },
  CANCELLED: { label: 'Annulée', color: '#64748b' },
};

let adShownThisSession = false;

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);

  const [wallet, setWallet] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [consolidatedData, setConsolidatedData] = useState<any>(null);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [indices, setIndices] = useState<any[]>([]);
  const [createWatchlistModal, setCreateWatchlistModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingWatchlist, setEditingWatchlist] = useState<any>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [addFundsModal, setAddFundsModal] = useState(false);
  const [addDividendModal, setAddDividendModal] = useState(false);
  const [dividendAmount, setDividendAmount] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [activeAd, setActiveAd] = useState<any>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [txSummary, setTxSummary] = useState<any>(null);
  const [dividends, setDividends] = useState<any[]>([]);

  // Charger le compteur de notifications non lues
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications/');
      setUnreadNotifications(res.data.unread_count || 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const maskValue = (val: any) => {
    if (isBalanceVisible) {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return (num || 0).toLocaleString('fr-FR');
    }
    return '••••••';
  };

  const toggleBalanceVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBalanceVisible(!isBalanceVisible);
  };

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const [userRes, walletRes, portfolioRes, watchlistsRes, marketRes, adsRes, consolidatedRes, txSummaryRes, txRes] =
        await Promise.all([
          apiClient.get('/users/'),
          apiClient.get('/wallet/'),
          apiClient.get('/investments/portfolio/'),
          apiClient.get('/watchlists/'),
          apiClient.get('/investments/market/'),
          apiClient.get('/ads/active/'),
          apiClient.get('/investments/consolidated/'),
          apiClient.get('/transactions/summary/'),
          apiClient.get('/transactions/'),
        ]);

      setUser(userRes.data);
      setWallet(walletRes.data);
      setPortfolio(portfolioRes.data?.portfolio ?? null);
      setConsolidatedData(consolidatedRes.data);
      setWatchlists(watchlistsRes.data || []);
      setTxSummary(txSummaryRes.data);
      
      const allTx = txRes.data?.results || txRes.data || [];
      const divOnly = allTx.filter((t: any) => t.transaction_type === 'DIVIDEND');
      setDividends(divOnly);

      const allMarket = marketRes.data || [];
      const brvmIndices = allMarket.filter((item: any) =>
        ['BRVMC', 'BRVM30', 'BRVMP'].includes(item.symbol)
      );
      setIndices(brvmIndices);
      
      if (adsRes.data && adsRes.data.length > 0) {
        setActiveAd(adsRes.data[0]);
      }
    } catch (e: any) {
      console.log('loadData error:', e?.response?.data || e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeAd && !adShownThisSession) {
      const timer = setTimeout(() => {
        setAdVisible(true);
        adShownThisSession = true;
        // Enregistrer la vue
        apiClient.post(`/ads/${activeAd.id}/interact/`, { type: 'VIEW' }).catch(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeAd]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Retour haptique pour une sensation moderne
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadData(false); // false pour ne pas montrer le chargement plein écran
    setRefreshing(false);
  };

  const handleCreateOrUpdateWatchlist = async () => {
    if (!newListName.trim()) return;
    try {
      if (editingWatchlist) {
        await apiClient.patch(`/watchlists/${editingWatchlist.id}/`, {
          name: newListName.trim(),
        });
      } else {
        await apiClient.post('/watchlists/', {
          name: newListName.trim(),
        });
      }
      setCreateWatchlistModal(false);
      setNewListName('');
      setEditingWatchlist(null);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d’enregistrer la liste');
    }
  };

  const handleDeleteWatchlist = (id: number, name: string) => {
    Alert.alert(
      'Supprimer la liste',
      `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/watchlists/${id}/`);
              loadData();
            } catch (e) {
              console.error(e);
              Alert.alert('Erreur', 'Impossible de supprimer la liste');
            }
          }
        }
      ]
    );
  };

  const handleAddFunds = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/transactions/', {
        transaction_type: 'DEPOSIT',
        amount: parseFloat(amount),
        description: 'Dépôt de fonds'
      });
      setAddFundsModal(false);
      setAmount('');
      Alert.alert('✅ Succès', 'Votre dépôt a été enregistré');
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le dépôt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDividend = async () => {
    if (!dividendAmount || isNaN(parseFloat(dividendAmount))) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    if (!selectedSymbol) {
      Alert.alert('Erreur', 'Veuillez sélectionner une entreprise');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/transactions/', {
        transaction_type: 'DIVIDEND',
        amount: parseFloat(dividendAmount),
        description: `Dividende reçu de ${selectedSymbol}`
      });
      setAddDividendModal(false);
      setDividendAmount('');
      setSelectedSymbol('');
      Alert.alert('💰 Dividende reçu !', 'Vos dividendes ont été crédités sur votre compte BEDOU.');
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le dividende');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    if (parseFloat(amount) > parseFloat(wallet?.balance || 0)) {
      Alert.alert('Erreur', 'Solde insuffisant');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/transactions/', {
        transaction_type: 'WITHDRAWAL',
        amount: parseFloat(amount),
        description: 'Retrait de fonds'
      });
      setWithdrawModal(false);
      setAmount('');
      Alert.alert('✅ Succès', 'Votre retrait a été effectué');
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d\'effectuer le retrait');
    } finally {
      setSubmitting(false);
    }
  };

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

  const getTotalBalance = () => {
    if (consolidatedData) {
      return consolidatedData.total_net_worth;
    }
    const cash = parseFloat(wallet?.balance || 0);
    const invested = parseFloat(portfolio?.totalCurrentValue || 0);
    return cash + invested;
  };

  // ===== DASHBOARD ACCUEIL =====
  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const profileLabels: any = {
    prudent: { label: 'Prudent 🛡️', color: '#10b981' },
    equilibre: { label: 'Équilibré ⚖️', color: '#38bdf8' },
    dynamique: { label: 'Dynamique 🚀', color: '#a78bfa' }
  };

  const userProfile = user?.investor_profile ? profileLabels[user.investor_profile] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View entering={FadeInUp.duration(600)} style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={[styles.avatar, { backgroundColor: colors.primary, marginRight: 15 }]} 
            onPress={() => router.push('/profile' as any)}
          >
            <Text style={styles.avatarText}>{user?.first_name?.charAt(0) || 'U'}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.subtext }]}>Bonjour,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.first_name || 'Investisseur'}</Text>

              {userProfile && (
                <View style={{
                  backgroundColor: userProfile.color + '20',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginLeft: 10,
                  marginTop: 4
                }}>
                  <Text style={{ color: userProfile.color, fontSize: 11, fontWeight: '700' }}>
                    {userProfile.label}
                  </Text>
                </View>
              )}
            </View>
          </View>

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
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Cloche notifications */}
          <TouchableOpacity
            style={[styles.supportBtn, { marginLeft: 8 }]}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadNotifications > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        {/* Carte patrimoine principale */}
        <View style={styles.mainCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.mainCardLabel}>Solde total</Text>
            <TouchableOpacity onPress={toggleBalanceVisibility} style={{ padding: 4 }}>
              <Ionicons 
                name={isBalanceVisible ? "eye-outline" : "eye-off-outline"} 
                size={22} 
                color="#ffffff" 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.mainCardAmount}>
            {maskValue(getTotalBalance())} FCFA
          </Text>

          <View style={styles.mainCardRow}>
            <View style={styles.mainCardCol}>
              <Text style={styles.chipLabel}>Espèces disponibles</Text>
              <Text style={styles.chipValue}>
                {maskValue(consolidatedData?.total_balance ?? wallet?.balance)} FCFA
              </Text>
            </View>
            
            <View style={styles.mainCardCol}>
              <Text style={styles.chipLabel}>Valeur du Portefeuille</Text>
              <Text style={styles.chipValue}>
                {maskValue(consolidatedData?.total_current_value ?? portfolio?.totalCurrentValue)} FCFA
              </Text>
            </View>
          </View>

          <View style={styles.mainCardActions}>
            <TouchableOpacity
              style={[styles.mainCta, { backgroundColor: '#22c55e' }]}
              onPress={() => setAddFundsModal(true)}
            >
              <Text style={styles.mainCtaText}>Déposer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainCta, { backgroundColor: '#6366f1' }]}
              onPress={() => router.push('/investments' as any)}
            >
              <Text style={styles.mainCtaText}>Investir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Solde d’investissement (performance) */}
        {(consolidatedData || portfolio) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Patrimoine Global</Text>
            <View style={styles.investCard}>
              <View>
                <Text style={styles.investLabel}>Valeur boursière</Text>
                <Text style={styles.investValue}>
                  {maskValue(consolidatedData?.total_current_value ?? portfolio?.totalCurrentValue)} FCFA
                </Text>
                <Text style={styles.investSub}>
                  Total investi : {maskValue(consolidatedData?.total_invested ?? portfolio?.totalInvested)} FCFA
                </Text>
              </View>

              {(() => {
                const perf = consolidatedData 
                  ? parseFloat(consolidatedData.total_gain_loss_percentage || 0)
                  : parseFloat(portfolio?.totalGainLossPercentage || 0);
                const color = perf > 0 ? '#10b981' : perf < 0 ? '#ff5252' : '#e5e7eb';
                const sign = perf > 0 ? '+' : '';

                return (
                  <View style={styles.perfBadge}>
                    <Text style={[styles.perfText, { color }]}>
                      {sign}{perf.toFixed(2)}%
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Indices BRVM */}
        {indices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌍 Indices BRVM</Text>
            <View style={styles.indicesRow}>
              {indices.map((idx) => {
                const variation = parseFloat(idx.variation || 0);
                const isPositive = variation >= 0;
                const label = idx.symbol === 'BRVMC' ? 'Composite' : idx.symbol === 'BRVM30' ? 'BRVM 30' : 'Prestige';

                return (
                  <View key={idx.symbol} style={[styles.indexCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.indexLabel, { color: colors.subtext }]}>{label}</Text>
                    <Text style={[styles.indexValue, { color: colors.text }]}>{parseFloat(idx.close).toFixed(2)}</Text>
                    <View style={[styles.indexPerf, { backgroundColor: isPositive ? '#10b98120' : '#ff525220' }]}>
                      <Text style={[styles.indexPerfText, { color: isPositive ? '#10b981' : '#ff5252' }]}>
                        {isPositive ? '+' : ''}{variation.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Raccourcis */}
        <Text style={styles.sectionTitle}>Raccourcis</Text>
        <View style={styles.shortcutsGrid}>
          {[
            { icon: '📊', label: 'Actions', onPress: () => router.push('/investments' as any) },
            { icon: '📖', label: "Carnet d'ordre", onPress: () => router.push('/orderbook' as any) },
            { icon: '🤝', label: 'Le Club', onPress: () => router.push('/club' as any) },
            { icon: '🎓', label: 'Academy', onPress: () => {
              if (user?.investor_profile) {
                router.push({ pathname: '/academy', params: { profile: user.investor_profile } } as any);
              } else {
                router.push('/academy/questionnaire' as any);
              }
            }},
            { icon: '📈', label: 'Classement', onPress: () => router.push('/leaderboard' as any) },
            { icon: '📰', label: 'Nouvelles', onPress: () => router.push('/news' as any) },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.shortcutBtn}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={styles.shortcutIconBg}>
                <Text style={styles.shortcutIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Listes de surveillance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👁 Listes de surveillance</Text>
            <TouchableOpacity
              onPress={() => setCreateWatchlistModal(true)}
              style={{ backgroundColor: '#1e293b', borderRadius: 20, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#38bdf8', fontSize: 20, lineHeight: 22, fontWeight: '300' }}>+</Text>
            </TouchableOpacity>
          </View>
          {watchlists.length === 0 ? (
            <TouchableOpacity
              style={{ backgroundColor: '#1e293b', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' }}
              onPress={() => setCreateWatchlistModal(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>👀</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Aucune liste de surveillance</Text>
              <Text style={{ color: '#38bdf8', fontSize: 12, marginTop: 4, fontWeight: '600' }}>+ Créer une liste</Text>
            </TouchableOpacity>
          ) : (
            watchlists.map((wl) => (
              <TouchableOpacity
                key={wl.id}
                style={[styles.watchlistCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/watchlist/${wl.id}` as any)}
              >
                <View style={styles.watchlistHeader}>
                  <Text style={[styles.watchlistName, { color: colors.text }]}>{wl.name}</Text>
                  <Text style={[styles.watchlistCount, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>
                    {wl.items?.length || 0} titres
                  </Text>
                </View>
                <View style={styles.watchlistItems}>
                  {(wl.items || []).slice(0, 4).map((item: any) => (
                    <View key={item.id} style={[styles.watchlistItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.watchlistSymbol, { color: colors.primary }]}>{item.symbol}</Text>
                    </View>
                  ))}
                  {(wl.items?.length || 0) > 4 && (
                    <Text style={{ color: colors.subtext, fontSize: 11 }}>
                      +{wl.items.length - 4}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Dividendes Reçus */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💰 Dividendes Reçus sur l'année</Text>
          </View>
          
          <View style={[styles.dividendMainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dividendMainHeader}>
              <View>
                <Text style={styles.dividendMainLabel}>Total annuel ({new Date().getFullYear()})</Text>
                <Text style={styles.dividendMainAmount}>
                  {maskValue(txSummary?.total_dividends_annual || 0)} FCFA
                </Text>
              </View>
              <View style={styles.dividendIconBadge}>
                <Ionicons name="calendar-outline" size={28} color="#f59e0b" />
              </View>
            </View>
            
            {(() => {
              const currentYear = new Date().getFullYear();
              const annualDivs = dividends.filter(d => new Date(d.created_at).getFullYear() === currentYear);
              
              if (annualDivs.length > 0) {
                return (
                  <View style={styles.dividendList}>
                    {annualDivs.slice(0, 3).map((div) => {
                      const company = div.description.replace('Dividende reçu de ', '').replace('Dividende reçu ', '');
                      const pName = div.portfolio_name || 'Bedou';
                      
                      return (
                        <View key={div.id} style={styles.dividendItem}>
                          <View style={styles.dividendItemLeft}>
                            <Text style={[styles.dividendItemSymbol, { color: colors.text }]}>
                              Reçu de {company} ({pName})
                            </Text>
                            <Text style={styles.dividendItemDate}>{formatDate(div.created_at)}</Text>
                          </View>
                          <Text style={styles.dividendItemAmount}>+{parseFloat(div.amount).toLocaleString('fr-FR')} FCFA</Text>
                        </View>
                      );
                    })}
                    {annualDivs.length > 3 && (
                      <TouchableOpacity onPress={() => router.push('/history' as any)}>
                        <Text style={{ color: colors.primary, fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' }}>Voir tout</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }
              return (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: colors.subtext, fontSize: 12, fontStyle: 'italic' }}>Aucun dividende reçu cette année</Text>
                </View>
              );
            })()}
          </View>
        </View>

      </Animated.View>
    </ScrollView>

      <Modal
        visible={createWatchlistModal}
        animationType="fade"
        transparent
        onRequestClose={() => { setCreateWatchlistModal(false); setNewListName(''); setEditingWatchlist(null); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }}>
            <View style={styles.modalBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.modalTitle}>{editingWatchlist ? 'Modifier la liste' : 'Nouvelle liste'}</Text>
                <TouchableOpacity onPress={() => { setCreateWatchlistModal(false); setNewListName(''); setEditingWatchlist(null); }}>
                  <Text style={{ color: '#64748b', fontSize: 22 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                {editingWatchlist ? 'Changez le nom de votre liste.' : 'Donnez un nom à votre liste de surveillance.'}
              </Text>
              <TextInput
                style={styles.input}
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Ex: Banques, Tech, Mes favoris..."
                placeholderTextColor="#64748b"
                returnKeyType="done"
                onSubmitEditing={handleCreateOrUpdateWatchlist}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: '#1e293b' }]}
                  onPress={() => { setCreateWatchlistModal(false); setNewListName(''); setEditingWatchlist(null); }}
                >
                  <Text style={{ color: '#94a3b8', fontWeight: '600', textAlign: 'center' }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: '#38bdf8' }]}
                  onPress={handleCreateOrUpdateWatchlist}
                >
                  <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>{editingWatchlist ? 'Enregistrer' : 'Créer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Dépôt */}
      <Modal
        visible={addFundsModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setAddFundsModal(false);
          setAmount('');
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
                  <Text style={styles.modalTitle}>⬇️ Déposer des fonds</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAddFundsModal(false);
                      setAmount('');
                    }}
                  >
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Montant (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="ex: 100000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  returnKeyType="done"
                  autoFocus
                  onSubmitEditing={handleAddFunds}
                />

                <View style={styles.quickAmounts}>
                  {['10000', '50000', '100000', '500000'].map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickBtn}
                      onPress={() => setAmount(q)}
                    >
                      <Text style={styles.quickBtnText}>
                        {parseInt(q).toLocaleString('fr-FR')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    submitting && styles.submitBtnDisabled,
                  ]}
                  onPress={handleAddFunds}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      ✅ Confirmer le dépôt
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Retrait */}
      <Modal
        visible={withdrawModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setWithdrawModal(false);
          setAmount('');
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
                  <Text style={styles.modalTitle}>⬆️ Retirer des fonds</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setWithdrawModal(false);
                      setAmount('');
                    }}
                  >
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.balanceHint}>
                  Solde disponible:{' '}
                  {parseFloat(wallet?.balance || 0).toLocaleString('fr-FR')}{' '}
                  FCFA
                </Text>

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
                  onSubmitEditing={handleWithdraw}
                />

                <View style={styles.quickAmounts}>
                  {['10000', '50000', '100000', '500000'].map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickBtn}
                      onPress={() => setAmount(q)}
                    >
                      <Text style={styles.quickBtnText}>
                        {parseInt(q).toLocaleString('fr-FR')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: '#ff5252' },
                    submitting && styles.submitBtnDisabled,
                  ]}
                  onPress={handleWithdraw}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      ✅ Confirmer le retrait
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Dividende */}
      <Modal
        visible={addDividendModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setAddDividendModal(false);
          setDividendAmount('');
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
                  <Text style={styles.modalTitle}>💰 Enregistrer un dividende</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAddDividendModal(false);
                      setDividendAmount('');
                    }}
                  >
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Entreprise</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {portfolio?.investments?.map((inv: any) => (
                    <TouchableOpacity
                      key={inv.id}
                      style={[
                        styles.quickBtn,
                        selectedSymbol === inv.symbol && { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)' }
                      ]}
                      onPress={() => setSelectedSymbol(inv.symbol)}
                    >
                      <Text style={[styles.quickBtnText, selectedSymbol === inv.symbol && { color: '#f59e0b' }]}>{inv.symbol}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Montant Net Reçu (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={dividendAmount}
                  onChangeText={setDividendAmount}
                  placeholder="ex: 5000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleAddDividend}
                />

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: '#f59e0b' },
                    (submitting || !dividendAmount) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleAddDividend}
                  disabled={submitting || !dividendAmount}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      ✅ Enregistrer le dividende
                    </Text>
                  )}
                </TouchableOpacity>

                <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
                  Les dividendes seront ajoutés à votre solde disponible.
                </Text>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Publicitaire (Ad Modal) */}
      <Modal
        visible={adVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAdVisible(false)}
      >
        <View style={styles.adOverlay}>
          <Animated.View entering={FadeInUp.duration(500)} style={[styles.adContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              style={styles.adCloseBtn} 
              onPress={() => setAdVisible(false)}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>

            <Image 
              source={{ 
                uri: activeAd?.image 
                  ? (activeAd.image.startsWith('http') ? activeAd.image : 'http://localhost:8000' + activeAd.image) 
                  : 'https://via.placeholder.com/400x250' 
              }} 
              style={styles.adImage}
              resizeMode="cover"
            />
            
            <View style={styles.adContent}>
              <View style={styles.adBadge}>
                <Text style={styles.adBadgeText}>OFFRE EXCLUSIVE</Text>
              </View>
              <Text style={[styles.adTitle, { color: colors.text }]}>{activeAd?.title || 'Annonce'}</Text>
              <Text style={[styles.adDesc, { color: colors.subtext }]}>
                {activeAd?.description || ''}
              </Text>
              
              <TouchableOpacity 
                style={[styles.adCta, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setAdVisible(false);
                  // Enregistrer le clic
                  apiClient.post(`/ads/${activeAd.id}/interact/`, { type: 'CLICK' }).catch(() => {});
                  
                  if (activeAd?.cta_link) {
                    if (activeAd.cta_link.startsWith('http')) {
                      Linking.openURL(activeAd.cta_link);
                    } else {
                      router.push(activeAd.cta_link as any);
                    }
                  }
                }}
              >
                <Text style={styles.adCtaText}>{activeAd?.cta_text || 'Découvrir'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.adMaybeLater}
                onPress={() => setAdVisible(false)}
              >
                <Text style={[styles.adMaybeLaterText, { color: colors.subtext }]}>Peut-être plus tard</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // DASHBOARD
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  greeting: { color: '#94a3b8', fontSize: 14 },
  userName: { color: '#f1f5f9', fontSize: 22, fontWeight: 'bold' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportBtn: {
    padding: 8,
    borderRadius: 12,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarText: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },

  // Nouvelle carte patrimoine
  mainCard: {
    backgroundColor: '#4c1d95',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  mainCardLabel: {
    color: '#e0e7ff',
    fontSize: 13,
    marginBottom: 6,
  },
  mainCardAmount: {
    color: '#f9fafb',
    fontSize: 30,
    fontWeight: '800',
  },
  mainCardRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  mainCardCol: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.25)',
  },
  chipLabel: {
    color: '#e5e7eb',
    fontSize: 11,
    marginBottom: 4,
  },
  chipValue: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '700',
  },
  mainCardActions: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  dividendCtaCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b40',
    borderStyle: 'dashed',
  },
  dividendCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividendIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividendCtaTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
  },
  dividendCtaSub: {
    color: '#94a3b8',
    fontSize: 12,
  },
  dividendAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividendAddBtnText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainCta: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mainCtaText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIcon: { fontSize: 18, marginBottom: 6 },
  statLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },

  section: { paddingHorizontal: 0, paddingBottom: 24, marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Carte investissement
  investCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  investValue: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  investSub: { color: '#64748b', fontSize: 12, marginTop: 4 },
  perfBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#020617',
  },
  perfText: { fontSize: 14, fontWeight: '700' },

  // Raccourcis
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  shortcutBtn: {
    width: '30%',
    marginBottom: 16,
    alignItems: 'center',
  },
  shortcutIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shortcutIcon: {
    fontSize: 24,
  },
  shortcutLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    textAlign: 'center',
  },
  // INDICES
  indicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  indexCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  indexLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  indexValue: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  indexPerf: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  indexPerfText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Watchlist
  watchlistCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  watchlistName: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
  },
  watchlistCount: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(56,189,248,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  watchlistItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  watchlistSymbolBadge: {},
  watchlistSymbol: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  watchlistArrow: {
    color: '#38bdf8',
    fontSize: 18,
    marginLeft: 6,
    fontWeight: '300',
  },

  // Historique

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#cbd5e1', fontSize: 15, fontWeight: '600' },
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

  // Dividendes
  dividendMainCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  dividendMainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividendMainLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  dividendMainAmount: { color: '#f59e0b', fontSize: 24, fontWeight: '800' },
  dividendIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f59e0b15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividendList: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  dividendListTitle: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  dividendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dividendItemLeft: { flex: 1 },
  dividendItemSymbol: { fontSize: 13, fontWeight: '600' },
  dividendItemDate: { color: '#64748b', fontSize: 11, marginTop: 2 },
  dividendItemAmount: { color: '#10b981', fontSize: 13, fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
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
  balanceHint: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f1f5f9',
    fontSize: 14,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#0f172a',
  },
  quickBtnText: { color: '#e5e7eb', fontSize: 12 },
  submitBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  
  // Ad Modal Styles
  adOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 15 }
    })
  },
  adCloseBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 2,
  },
  adImage: {
    width: '100%',
    height: 250,
  },
  adContent: {
    padding: 24,
    alignItems: 'center',
  },
  adBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  adBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  adTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  adDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  adCta: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  adCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  adMaybeLater: {
    padding: 10,
  },
  adMaybeLaterText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
