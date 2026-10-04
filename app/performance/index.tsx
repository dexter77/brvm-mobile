import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Share, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import apiClient from '../../src/api/client';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export default function PerformanceScreen() {
  const { tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState(tab === 'yearly' ? 'yearly' : 'monthly');
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [topPositions, setTopPositions] = useState<any[]>([]);
  const [totalHistoricalPerformance, setTotalHistoricalPerformance] = useState<number>(0);
  
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [showPortfolioSelector, setShowPortfolioSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedPortfolioId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = selectedPortfolioId ? { portfolio_id: selectedPortfolioId } : {};
      const [resSnapshots, resInvestments, resPortfolios] = await Promise.all([
        apiClient.get('/investments/portfolio_monthly/', { params }),
        apiClient.get('/investments/portfolio/', { params }),
        apiClient.get('/portfolios/')
      ]);
      
      const rawSnapshots = resSnapshots.data || [];
      
      const snapshots = rawSnapshots.filter(
        (s: any) => parseFloat(s.total_invested) > 0 || parseFloat(s.total_current_value) > 0
      );
      
      // Tri ascendant (chronologique) pour calculer les différences
      snapshots.sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

      const formattedMonthly = snapshots.map((s: any, index: number) => {
        let monthlyAmount = parseFloat(s.gain_loss || 0);
        let monthlyPerf = parseFloat(s.gain_loss_percentage || 0);
        
        if (index > 0) {
          const prev = snapshots[index - 1];
          monthlyAmount = parseFloat(s.gain_loss || 0) - parseFloat(prev.gain_loss || 0);
          const totalInvested = parseFloat(s.total_invested || 0);
          monthlyPerf = totalInvested > 0 ? (monthlyAmount / totalInvested) * 100 : 0;
        }

        return {
          period: `${months[s.month - 1]} ${s.year}`,
          performance: monthlyPerf.toFixed(2),
          amount: monthlyAmount,
          totalHistorical: parseFloat(s.gain_loss_percentage || 0)
        };
      });

      // On inverse pour l'affichage (du plus récent au plus ancien)
      formattedMonthly.reverse();

      const yearMap = new Map();
      for (const s of snapshots) {
        yearMap.set(s.year, s); // Garde le dernier snapshot de l'année
      }

      const yearlySnapshots = Array.from(yearMap.values());
      const formattedYearly = yearlySnapshots.map((s: any, index: number) => {
        let yearlyAmount = parseFloat(s.gain_loss || 0);
        let yearlyPerf = parseFloat(s.gain_loss_percentage || 0);

        if (index > 0) {
          const prev = yearlySnapshots[index - 1];
          yearlyAmount = parseFloat(s.gain_loss || 0) - parseFloat(prev.gain_loss || 0);
          const totalInvested = parseFloat(s.total_invested || 0);
          yearlyPerf = totalInvested > 0 ? (yearlyAmount / totalInvested) * 100 : 0;
        }

        return {
          period: `${s.year}`,
          performance: yearlyPerf.toFixed(2),
          amount: yearlyAmount,
          totalHistorical: parseFloat(s.gain_loss_percentage || 0)
        };
      });
      
      formattedYearly.reverse();

      setMonthlyData(formattedMonthly);
      setYearlyData(formattedYearly);

      // Traitement des investissements pour les meilleures positions
      const investments = resInvestments.data?.investments || [];
      const portfolioData = resInvestments.data?.portfolio;

      if (portfolioData) {
        setTotalHistoricalPerformance(parseFloat(portfolioData.totalGainLossPercentage || 0));
      }

      const colorsList = ['#ff6600', '#00529b', '#ff7900', '#e2001a', '#0f764a'];
      const sortedInvestments = investments
        .filter((inv: any) => parseFloat(inv.current_value) > 0)
        .sort((a: any, b: any) => parseFloat(b.gain_loss_percentage || 0) - parseFloat(a.gain_loss_percentage || 0))
        .slice(0, 3)
        .map((inv: any, idx: number) => ({
          symbol: inv.symbol || 'N/A',
          percentage: `${parseFloat(inv.gain_loss_percentage) >= 0 ? '+' : ''}${parseFloat(inv.gain_loss_percentage || 0).toFixed(2)}%`,
          color: colorsList[idx % colorsList.length],
          text: '#fff',
          logo_url: inv.logo_url || null
        }));
      setTopPositions(sortedInvestments);
      
      if (resPortfolios.data) {
        setPortfolios(resPortfolios.data);
      }
      
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de charger les performances.');
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      if (viewShotRef.current) {
        // Capture la vue sous forme d'image
        const uri = await viewShotRef.current.capture();
        
        // Partage l'image
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Partager la performance',
          });
        } else {
          Alert.alert("Erreur", "Le partage n'est pas disponible sur cet appareil.");
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de partager l'image.");
    }
  };

  const dataToDisplay = activeTab === 'monthly' ? monthlyData : yearlyData;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes Performances</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => setShowPortfolioSelector(true)}>
          <Ionicons name="filter" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Portfolio Selector Header */}
      <TouchableOpacity 
        style={[styles.portfolioSelectorBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowPortfolioSelector(true)}
      >
        <Text style={[styles.portfolioSelectorText, { color: colors.text }]}>
          {selectedPortfolioId 
            ? portfolios.find(p => p.id.toString() === selectedPortfolioId)?.name || 'Bedou sélectionné'
            : 'Vue globale (Défaut)'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'monthly' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('monthly')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'monthly' ? '#fff' : colors.text }]}>
            Mensuel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'yearly' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('yearly')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'yearly' ? '#fff' : colors.text }]}>
            Annuel
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des performances */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {dataToDisplay.length === 0 ? (
          <Text style={{ color: colors.subtext, textAlign: 'center', marginTop: 20 }}>Aucune donnée de performance disponible.</Text>
        ) : (
          dataToDisplay.map((item, index) => {
            const isPositive = parseFloat(item.performance) >= 0;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedSnapshot(item)}
              >
                <View style={styles.perfInfo}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>{activeTab === 'monthly' ? '📅' : '📊'}</Text>
                  </View>
                  <Text style={[styles.periodText, { color: colors.text }]}>{item.period}</Text>
                </View>
                <View style={styles.perfValues}>
                  <Text style={[styles.amountText, { color: isPositive ? '#10b981' : '#ef4444' }]}>
                    {isPositive ? '+' : ''}{item.amount.toLocaleString('fr-FR')} FCFA
                  </Text>
                  <View style={[styles.badge, { backgroundColor: isPositive ? '#10b98120' : '#ef444420' }]}>
                    <Text style={[styles.badgeText, { color: isPositive ? '#10b981' : '#ef4444' }]}>
                      {isPositive ? '+' : ''}{item.performance}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Détails */}
      <Modal visible={!!selectedSnapshot} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          
          <View style={styles.closeBtnContainer}>
            <TouchableOpacity onPress={() => setSelectedSnapshot(null)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
          </View>

          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={{ width: '100%' }}>
            <View style={[styles.bambooCard, { backgroundColor: '#481591' }]}>
              
              <Text style={styles.bambooTitle}>
                {selectedPortfolioId 
                  ? `Performance du bedou "${portfolios.find(p => p.id.toString() === selectedPortfolioId)?.name || ''}"`
                  : 'Performance des bedous'}
              </Text>
              <Text style={styles.bambooSubtitle}>{selectedSnapshot?.period}</Text>

              {/* Returns Cards */}
              <View style={styles.bambooReturnsContainer}>
                <View style={styles.bambooReturnCard}>
                  <Text style={styles.bambooReturnLabel}>Gain/Perte ({activeTab === 'monthly' ? 'Mois' : 'Année'})</Text>
                  <Text style={[
                    styles.bambooReturnValue, 
                    { color: parseFloat(selectedSnapshot?.performance) >= 0 ? '#16a34a' : '#ef4444' }
                  ]}>
                    {parseFloat(selectedSnapshot?.performance) >= 0 ? '+' : ''}{selectedSnapshot?.performance}%
                  </Text>
                </View>
                <View style={styles.bambooReturnCard}>
                  <Text style={styles.bambooReturnLabel}>Total Historique</Text>
                  <Text style={[
                    styles.bambooReturnValue, 
                    { color: (selectedSnapshot?.totalHistorical || 0) >= 0 ? '#16a34a' : '#ef4444' }
                  ]}>
                    {(selectedSnapshot?.totalHistorical || 0) >= 0 ? '+' : ''}{(selectedSnapshot?.totalHistorical || 0).toFixed(2)}%
                  </Text>
                </View>
              </View>

              {/* Allocation */}
              <View style={styles.bambooAllocationSection}>
                <View style={styles.bambooDividerContainer}>
                  <View style={styles.bambooDivider} />
                  <Text style={styles.bambooAllocationTitle}>Mes meilleures positions</Text>
                  <View style={styles.bambooDivider} />
                </View>

                <View style={styles.bambooAllocationList}>
                  {topPositions.length > 0 ? topPositions.map((alloc, idx) => (
                    <View key={idx} style={styles.bambooAllocationItem}>
                      <View style={[styles.bambooAllocIcon, { backgroundColor: alloc.color, overflow: 'hidden' }]}>
                        {alloc.logo_url ? (
                          <View style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                            <Image source={{ uri: alloc.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          </View>
                        ) : (
                          <Text style={[styles.bambooAllocSymbol, { color: alloc.text }]}>
                            {alloc.symbol.substring(0, 3)}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.bambooAllocPct}>{alloc.percentage}</Text>
                    </View>
                  )) : (
                    <Text style={{ color: '#fff', opacity: 0.8 }}>Aucune position active</Text>
                  )}
                </View>
              </View>

              {/* Referral Banner / Share */}
              <View style={styles.bambooReferralCard}>
                <View style={styles.bambooReferralInfo}>
                  <Text style={styles.bambooReferralLabel}>Crée ton portefeuille virtuel avec Bedou Magique</Text>
                </View>
              </View>

            </View>
          </ViewShot>

          <TouchableOpacity style={styles.bambooShareBtn} onPress={onShare}>
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.bambooShareText}>Partager l'image</Text>
          </TouchableOpacity>

        </View>
      </Modal>

      {/* Modal Portfolio Selector */}
      <Modal visible={showPortfolioSelector} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowPortfolioSelector(false)}
        >
          <View style={[styles.selectorContainer, { backgroundColor: colors.card }]}>
            <View style={styles.selectorHeader}>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>Choisir un Bedou</Text>
              <TouchableOpacity onPress={() => setShowPortfolioSelector(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[
                  styles.selectorOption,
                  !selectedPortfolioId && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setSelectedPortfolioId(null);
                  setShowPortfolioSelector(false);
                }}
              >
                <Text style={[
                  styles.selectorOptionText, 
                  { color: colors.text },
                  !selectedPortfolioId && { fontWeight: '700', color: colors.primary }
                ]}>
                  Vue globale (Défaut)
                </Text>
                {!selectedPortfolioId && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
              {portfolios.map((portfolio) => (
                <TouchableOpacity
                  key={portfolio.id}
                  style={[
                    styles.selectorOption,
                    selectedPortfolioId === portfolio.id.toString() && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSelectedPortfolioId(portfolio.id.toString());
                    setShowPortfolioSelector(false);
                  }}
                >
                  <Text style={[
                    styles.selectorOptionText, 
                    { color: colors.text },
                    selectedPortfolioId === portfolio.id.toString() && { fontWeight: '700', color: colors.primary }
                  ]}>
                    {portfolio.name}
                  </Text>
                  {selectedPortfolioId === portfolio.id.toString() && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  portfolioSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
    gap: 8,
  },
  portfolioSelectorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  perfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  perfInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#38bdf820',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
  },
  perfValues: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal Bamboo Style
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  closeBtnContainer: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bambooCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  bambooTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  bambooSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  bambooReturnsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  bambooReturnCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  bambooReturnLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  bambooReturnValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  bambooAllocationSection: {
    marginBottom: 24,
  },
  bambooDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bambooDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ffffff',
    opacity: 0.3,
  },
  bambooAllocationTitle: {
    color: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  bambooAllocationList: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  bambooAllocationItem: {
    width: 80,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  bambooAllocIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bambooAllocSymbol: {
    fontSize: 13,
    fontWeight: '800',
  },
  bambooAllocPct: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '800',
  },
  bambooReferralCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bambooReferralInfo: {
    alignItems: 'center',
  },
  bambooReferralLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  bambooShareBtn: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    width: '100%',
  },
  bambooShareText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  selectorContainer: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectorOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectorOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
