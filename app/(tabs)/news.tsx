import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';

type NewsItem = {
  id: number;
  title: string;
  summary: string;
  category: string;
  company: string;
  source: string;
  boc_date: string;
  created_at: string;
};

const CATEGORIES = [
  { key: 'ALL',        label: 'Tout',        icon: '🗞️',  color: '#38bdf8' },
  { key: 'REPORT',     label: 'Rapports',    icon: '📊',  color: '#a78bfa' },
  { key: 'DIVIDEND',   label: 'Dividendes',  icon: '💰',  color: '#10b981' },
  { key: 'ASSEMBLY',   label: 'AG',          icon: '🏛️',  color: '#f59e0b' },
  { key: 'RATING',     label: 'Notation',    icon: '⭐',  color: '#06b6d4' },
  { key: 'MARKET',     label: 'Marché',      icon: '📈',  color: '#38bdf8' },
  { key: 'COMPANY',    label: 'Sociétés',    icon: '🏢',  color: '#818cf8' },
  { key: 'ECONOMY',    label: 'Économie',    icon: '🌍',  color: '#34d399' },
  { key: 'REGULATION', label: 'Réglement.',  icon: '⚖️',  color: '#fb923c' },
];

const getCat = (key: string) =>
  CATEGORIES.find(c => c.key === key) || CATEGORIES[0];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

const BOC_DATE_LABEL = (d: string) =>
  `BOC du ${new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })}`;

export default function NewsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadNews = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'ALL') params.category = filter;
      const res = await apiClient.get('/boc-news/', { params });
      setNews(res.data || []);
    } catch (e) {
      console.error('News load error:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadNews(); }, [loadNews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNews();
    setRefreshing(false);
  };

  const filtered = search.trim()
    ? news.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.company.toLowerCase().includes(search.toLowerCase())
      )
    : news;

  // Grouper par date BOC
  const grouped: Record<string, NewsItem[]> = {};
  filtered.forEach(item => {
    const key = item.boc_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        stickyHeaderIndices={[0]}
      >
        {/* Header sticky */}
        <View style={[styles.stickyHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>📰 Actualités BRVM</Text>
              <Text style={[styles.subtitle, { color: colors.subtext }]}>Résumés du Bulletin Officiel de la Cote</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{filtered.length}</Text>
            </View>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une société, un sujet..."
              placeholderTextColor="#475569"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={{ color: '#64748b', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filtres catégories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.filterBtn,
                  filter === cat.key && { backgroundColor: cat.color + '20', borderColor: cat.color },
                ]}
                onPress={() => setFilter(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.filterLabel,
                  filter === cat.key && { color: cat.color, fontWeight: '700' },
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Contenu */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={{ color: '#64748b', marginTop: 12, fontSize: 13 }}>
              Chargement des actualités...
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Aucune actualité</Text>
            <Text style={styles.emptyText}>
              Importez un BOC pour voir les actualités apparaître ici.
            </Text>
          </View>
        ) : (
          <View style={{ paddingBottom: 40 }}>
            {sortedDates.map(date => (
              <View key={date}>
                {/* Séparateur date BOC */}
                <View style={styles.dateSeparator}>
                  <View style={styles.dateLine} />
                  <View style={styles.datePill}>
                    <Text style={styles.datePillText}>{BOC_DATE_LABEL(date)}</Text>
                  </View>
                  <View style={styles.dateLine} />
                </View>

                {grouped[date].map((item, idx) => {
                  const cat = getCat(item.category);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.card, idx === 0 && styles.cardFirst]}
                      activeOpacity={0.75}
                      onPress={() =>
                        router.push({
                          pathname: '/news/[id]',
                          params: { id: String(item.id) },
                        } as any)
                      }
                    >
                      {/* Accent couleur à gauche */}
                      <View style={[styles.cardAccent, { backgroundColor: cat.color }]} />

                      <View style={styles.cardBody}>
                        {/* Badges */}
                        <View style={styles.cardTags}>
                          <View style={[styles.tag, { backgroundColor: cat.color + '18', borderColor: cat.color + '40' }]}>
                            <Text style={styles.tagIcon}>{cat.icon}</Text>
                            <Text style={[styles.tagText, { color: cat.color }]}>
                              {cat.label.toUpperCase()}
                            </Text>
                          </View>
                          {item.company && item.company !== 'BRVM' && (
                            <View style={styles.tagCompany}>
                              <Text style={styles.tagCompanyText}>{item.company}</Text>
                            </View>
                          )}
                        </View>

                        {/* Titre */}
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {item.title}
                        </Text>

                        {/* Résumé */}
                        <Text style={styles.cardSummary} numberOfLines={3}>
                          {item.summary}
                        </Text>

                        {/* Footer */}
                        <View style={styles.cardFooter}>
                          <Text style={styles.cardSource}>{item.source}</Text>
                          <View style={styles.readMore}>
                            <Text style={styles.readMoreText}>Lire l'analyse</Text>
                            <Text style={[styles.readMoreText, { fontSize: 14 }]}>→</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f172a' },
  centered:     { alignItems: 'center', paddingVertical: 60 },

  /* Header sticky */
  stickyHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:        { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  subtitle:     { color: '#475569', fontSize: 11, marginTop: 2 },
  countBadge:   { backgroundColor: '#38bdf820', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#38bdf840' },
  countText:    { color: '#38bdf8', fontSize: 13, fontWeight: '700' },

  /* Search */
  searchBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  searchIcon:   { fontSize: 14, marginRight: 8 },
  searchInput:  { flex: 1, color: '#f1f5f9', fontSize: 13 },

  /* Filtres */
  filterRow:    { gap: 8, paddingRight: 4 },
  filterBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  filterIcon:   { fontSize: 12 },
  filterLabel:  { color: '#64748b', fontSize: 11, fontWeight: '600' },

  /* Séparateur de date */
  dateSeparator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 16 },
  dateLine:      { flex: 1, height: 1, backgroundColor: '#1e293b' },
  datePill:      { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#1e293b', borderRadius: 20, marginHorizontal: 8, borderWidth: 1, borderColor: '#334155' },
  datePillText:  { color: '#64748b', fontSize: 10, fontWeight: '700' },

  /* Cards */
  cardFirst:  { marginTop: 0 },
  card: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: 14 },
  cardTags:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  tagIcon:    { fontSize: 10 },
  tagText:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  tagCompany: { backgroundColor: '#0f172a', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#334155' },
  tagCompanyText: { color: '#94a3b8', fontSize: 9, fontWeight: '600' },

  cardTitle:   { color: '#f1f5f9', fontSize: 13, fontWeight: '700', marginBottom: 6, lineHeight: 18 },
  cardSummary: { color: '#94a3b8', fontSize: 11, lineHeight: 16, marginBottom: 10 },

  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#0f172a' },
  cardSource:     { color: '#475569', fontSize: 9, fontWeight: '600' },
  readMore:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMoreText:   { color: '#38bdf8', fontSize: 10, fontWeight: '700' },

  /* Empty */
  empty:      { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: '#cbd5e1', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyText:  { color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
