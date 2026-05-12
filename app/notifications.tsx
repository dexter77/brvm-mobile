import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../src/api/client';
import { useTheme } from '../src/context/ThemeContext';

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  COURSE:      { emoji: '🎓', color: '#6366f1' },
  POST:        { emoji: '🎬', color: '#8b5cf6' },
  TIP:         { emoji: '💡', color: '#f59e0b' },
  PORTFOLIO:   { emoji: '📊', color: '#10b981' },
  TRANSACTION: { emoji: '✅', color: '#38bdf8' },
  INFO:        { emoji: 'ℹ️',  color: '#64748b' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications/');
      setNotifications(res.data.results || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) {
      console.error('Erreur chargement notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const renderItem = ({ item }: { item: any }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.INFO;
    return (
      <View style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        !item.is_read && { borderLeftColor: config.color, borderLeftWidth: 3 },
      ]}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.icon}>{config.emoji}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }, !item.is_read && { fontWeight: '700' }]}>
            {item.title}
          </Text>
          <Text style={[styles.body, { color: colors.subtext }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.time, { color: colors.subtext }]}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && (
          <View style={[styles.unreadDot, { backgroundColor: config.color }]} />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🔔 Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[styles.markRead, { color: colors.primary }]}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Badge résumé */}
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔕</Text>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>Aucune notification pour le moment</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadNotifications(); }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  markRead: { fontSize: 13, fontWeight: '600' },
  badge: {
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  badgeText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, borderRadius: 14,
    borderWidth: 1, marginBottom: 10,
    position: 'relative',
  },
  iconContainer: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  body: { fontSize: 13, lineHeight: 18, marginBottom: 5 },
  time: { fontSize: 11 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    position: 'absolute', top: 14, right: 14,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
