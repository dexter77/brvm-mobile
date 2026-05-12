import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import apiClient from '../src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface UserRank {
  rank: number;
  first_name: string;
  last_name: string;
  performance: number;
  is_me: boolean;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserRank[]>([]);
  const [period, setPeriod] = useState<string>('all'); // day, week, month, year, all

  useEffect(() => {
    loadLeaderboard(period);
  }, [period]);

  const loadLeaderboard = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/investments/leaderboard/?period=${selectedPeriod}`);
      setData(res.data);
    } catch (e) {
      console.log('Error fetching leaderboard', e);
    } finally {
      setLoading(false);
    }
  };

  const renderTopThree = () => {
    if (data.length === 0) return null;
    const top3 = data.slice(0, 3);
    
    // We want the order to be: 2nd, 1st, 3rd visually
    const displayOrder = [];
    if (top3[1]) displayOrder.push(top3[1]);
    displayOrder.push(top3[0]);
    if (top3[2]) displayOrder.push(top3[2]);

    return (
      <View style={styles.podiumContainer}>
        {displayOrder.map((user) => {
          const isFirst = user.rank === 1;
          const isSecond = user.rank === 2;
          const isThird = user.rank === 3;
          
          let podiumHeight = 100;
          let crownColor = '#D4AF37'; // Gold
          if (isFirst) { podiumHeight = 140; crownColor = '#FFDF00'; }
          if (isSecond) { podiumHeight = 110; crownColor = '#C0C0C0'; }
          if (isThird) { podiumHeight = 90; crownColor = '#CD7F32'; }

          return (
            <View key={user.rank} style={[styles.podiumItem, isFirst && styles.podiumItemFirst]}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.card, borderColor: isFirst ? crownColor : colors.border }, user.is_me && { borderColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.text }]}>{user.first_name[0]}{user.last_name[0]}</Text>
              </View>
              {isFirst && <Ionicons name="trophy" size={24} color={crownColor} style={styles.crown} />}
              <Text style={[styles.podiumName, { color: colors.text }, user.is_me && { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
                {user.first_name}
              </Text>
              <Text style={[styles.podiumPerf, user.performance < 0 ? { color: '#ff5252' } : { color: '#22c55e' }]}>
                {user.performance > 0 ? '+' : ''}{user.performance}%
              </Text>
              <View
                style={[
                  styles.podiumBlock, 
                  { 
                    height: podiumHeight, 
                    backgroundColor: isFirst ? crownColor : isSecond ? '#94a3b8' : '#b45309' 
                  }
                ]}
              >
                <Text style={styles.podiumRank}>{user.rank}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: UserRank }) => {
    // Top 3 already displayed
    if (item.rank <= 3) return null;

    return (
      <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }, item.is_me && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}>
        <Text style={[styles.listRank, { color: colors.subtext }]}>{item.rank}</Text>
        <View style={[styles.avatarCircleSmall, { backgroundColor: colors.background }]}>
          <Text style={[styles.avatarTextSmall, { color: colors.text }]}>{item.first_name[0]}{item.last_name[0]}</Text>
        </View>
        <View style={styles.listNameContainer}>
          <Text style={[styles.listName, { color: colors.text }]}>
            {item.first_name} {item.last_name} {item.is_me && <Text style={{ color: colors.primary }}>(Vous)</Text>}
          </Text>
        </View>
        <View style={[styles.perfBadge, item.performance < 0 ? { backgroundColor: 'rgba(255, 82, 82, 0.15)' } : { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
          <Text style={[styles.listPerf, item.performance < 0 ? { color: '#ff5252' } : { color: '#22c55e' }]}>
            {item.performance > 0 ? '+' : ''}{item.performance.toFixed(2)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Meilleurs investisseurs</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={[styles.filterContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {[
          { label: 'Jour', value: 'day' },
          { label: 'Semaine', value: 'week' },
          { label: 'Mois', value: 'month' },
          { label: 'Année', value: 'year' },
          { label: 'Global', value: 'all' },
        ].map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.filterButton, { backgroundColor: colors.card }, period === p.value && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[styles.filterText, { color: colors.subtext }, period === p.value && { color: '#fff' }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : data.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtext }]}>Aucun investisseur classé pour le moment.</Text>
        ) : (
          <FlatList
            data={data}
            keyExtractor={item => item.rank.toString()}
            ListHeaderComponent={renderTopThree}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backButton: {
    padding: 5,
  },
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: 50,
    marginBottom: 40,
    height: 280,
  },
  podiumItem: {
    alignItems: 'center',
    width: width * 0.3,
  },
  podiumItemFirst: {
    zIndex: 10,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarCircleSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  avatarTextSmall: {
    fontSize: 16,
    fontWeight: '700',
  },
  crown: {
    position: 'absolute',
    top: -28,
  },
  podiumName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  podiumPerf: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  podiumBlock: {
    width: '90%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  podiumRank: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    opacity: 0.8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  listRank: {
    fontSize: 17,
    fontWeight: '800',
    width: 35,
  },
  listNameContainer: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
  },
  perfBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  listPerf: {
    fontWeight: '800',
    fontSize: 14,
  },
});
