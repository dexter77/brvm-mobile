import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = { investments: any[]; portfolio: any };

export default function PortfolioChart({ investments, portfolio }: Props) {
  const [tab, setTab] = useState('line');

  const totalInvested = parseFloat(portfolio?.totalInvested || 0);
  const totalCurrent = parseFloat(portfolio?.totalCurrentValue || totalInvested);
  const gainLossPct = parseFloat(portfolio?.totalGainLossPercentage || 0);
  const isPositive = gainLossPct >= 0;

  return (
    <View style={s.wrapper}>
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Investi</Text>
          <Text style={s.statValue}>{totalInvested.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={s.div} />
        <View style={s.statBox}>
          <Text style={s.statLabel}>Actuel</Text>
          <Text style={[s.statValue, { color: '#38bdf8' }]}>{totalCurrent.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={s.div} />
        <View style={s.statBox}>
          <Text style={s.statLabel}>+/-</Text>
          <Text style={[s.statValue, { color: isPositive ? '#10b981' : '#ef4444' }]}>
            {isPositive ? '+' : ''}{gainLossPct.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'line' && s.tabActive]} onPress={() => setTab('line')}>
          <Text style={[s.tabText, tab === 'line' && s.tabTextActive]}>Evolution</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'pie' && s.tabActive]} onPress={() => setTab('pie')}>
          <Text style={[s.tabText, tab === 'pie' && s.tabTextActive]}>Repartition</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'bar' && s.tabActive]} onPress={() => setTab('bar')}>
          <Text style={[s.tabText, tab === 'bar' && s.tabTextActive]}>Performance</Text>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <Text style={s.chartTitle}>Graphiques en cours de chargement...</Text>
        <View style={s.placeholder}>
          <Text style={s.placeholderText}>📊</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 16 },
  statsRow: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  statBox: { flex: 1, alignItems: 'center' },
  div: { width: 1, backgroundColor: '#334155' },
  statLabel: { color: '#64748b', fontSize: 10, marginBottom: 4 },
  statValue: { color: '#f1f5f9', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  tabActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#0f172a', fontWeight: '700' },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  chartTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  placeholder: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 8 },
  placeholderText: { fontSize: 48 },
});
