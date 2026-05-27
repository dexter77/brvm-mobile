import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SectionList, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../src/api/client';

export default function DividendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [allDividends, setAllDividends] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDividends();
  }, []);

  useEffect(() => {
    buildSections(allDividends, searchQuery);
  }, [allDividends, searchQuery]);

  const fetchDividends = async () => {
    try {
      const res = await apiClient.get('/dividends/');
      const data = res.data.results || res.data;
      setAllDividends(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const buildSections = (data: any[], query: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: any[] = [];
    const past: any[] = [];
    
    const lowerQuery = query.toLowerCase().trim();

    data.forEach((item: any) => {
      // Filtrage par recherche
      const symbol = item.company_symbol?.toLowerCase() || '';
      const name = item.company_name?.toLowerCase() || '';
      if (lowerQuery && !symbol.includes(lowerQuery) && !name.includes(lowerQuery)) {
        return;
      }

      if (!item.payment_date) {
        upcoming.push(item);
      } else {
        const paymentDate = new Date(item.payment_date);
        if (paymentDate >= today) {
          upcoming.push(item);
        } else {
          past.push(item);
        }
      }
    });

    // Tri des paiements à venir : du plus proche au plus éloigné
    upcoming.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    
    // Tri des paiements passés : du plus récent au plus ancien
    past.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    const newSections = [];
    if (upcoming.length > 0) {
      newSections.push({ title: 'Paiements à venir ⏳', data: upcoming });
    }
    if (past.length > 0) {
      newSections.push({ title: 'Paiements passés ✅', data: past });
    }

    setSections(newSections);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'À venir';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const renderItem = ({ item, section }: { item: any, section: any }) => {
    const isPast = section.title.includes('passés');
    return (
      <View style={[styles.dividendCard, isPast && styles.pastCard]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.symbol, isPast && styles.pastText]}>{item.company_symbol}</Text>
            <Text style={styles.companyName}>{item.company_name}</Text>
          </View>
          <View style={[styles.amountBadge, isPast && styles.pastAmountBadge]}>
            <Text style={[styles.amountText, isPast && styles.pastAmountText]}>
              {parseFloat(item.dividend).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.dateInfo}>
            <Ionicons name={isPast ? "checkmark-circle" : "calendar-outline"} size={16} color={isPast ? "#10b981" : "#94a3b8"} />
            <Text style={styles.dateLabel}>{isPast ? "Payé le : " : "Prévu le : "}</Text>
            <Text style={styles.dateValue}>{formatDate(item.payment_date)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: any }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendrier des Dividendes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une action (ex: SONATEL)"
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#334155" />
          <Text style={styles.emptyText}>Aucun dividende trouvé.</Text>
          <Text style={styles.emptySubText}>
            {searchQuery ? "Aucune action ne correspond à votre recherche." : "Les annonces de paiement apparaîtront ici."}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  dividendCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pastCard: {
    opacity: 0.75,
    backgroundColor: '#0f172a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbol: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  pastText: {
    color: '#cbd5e1',
  },
  companyName: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  amountBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pastAmountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  amountText: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: '700',
  },
  pastAmountText: {
    color: '#10b981',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginLeft: 6,
  },
  dateValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  }
});
