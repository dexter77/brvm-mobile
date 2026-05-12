import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../src/context/ThemeContext';

const W = Dimensions.get('window').width;
const COLORS = ['#38bdf8', '#a78bfa', '#10b981', '#f59e0b', '#ef4444', '#f472b6'];

const CFG = {
  backgroundColor: '#1e293b',
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#0f172a',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#38bdf8' },
  propsForBackgroundLines: { stroke: '#334155', strokeDasharray: '' },
};

type Investment = {
  symbol: string;
  gain_loss_percentage: string | number;
  [key: string]: any;
};

type Props = { investments: Investment[]; portfolio: any };

export default function PortfolioChart({ investments, portfolio }: Props) {
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<'line' | 'pie' | 'bar'>('line');

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${isDark ? '56, 189, 248' : '99, 102, 241'}, ${opacity})`,
    labelColor: (opacity = 1) => colors.subtext,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
    propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '' },
  };

  const totalInvested = parseFloat(portfolio?.totalInvested || 0);
  const totalCurrent  = parseFloat(portfolio?.totalCurrentValue || totalInvested);
  const gainLossPct   = parseFloat(portfolio?.totalGainLossPercentage || 0);
  const isPositive    = gainLossPct >= 0;

  const lineData = () => {
    const labels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun'];
    const step = (totalCurrent - totalInvested) / 5;
    const data = labels.map((_, i) =>
      Math.max(0, Math.round(totalInvested + step * i + Math.sin(i) * totalInvested * 0.02))
    );
    data[5] = Math.round(totalCurrent);
    return { labels, datasets: [{ data }] };
  };

  const pieData = () => {
    if (!investments || investments.length === 0) {
      return [{ name: 'Aucun', population: 1, color: '#334155', legendFontColor: '#64748b', legendFontSize: 12 }];
    }
    return investments.slice(0, 5).map((inv, i) => ({
      name: inv.symbol,
      population: Math.max(parseFloat(inv.current_value) || 100, 1),
      color: COLORS[i % COLORS.length],
      legendFontColor: '#94a3b8',
      legendFontSize: 12,
    }));
  };

  const barData = () => {
    if (!investments || investments.length === 0) {
      return { labels: ['-'], datasets: [{  [0] }] };
    }
    const top5 = investments.slice(0, 5);
    return {
      labels: top5.map((inv) => inv.symbol),
      datasets: [{  top5.map((inv) => parseFloat(inv.gain_loss_percentage) || 0) }],
    };
  };

  const tabs = [
    { key: 'line', label: 'Evolution' },
    { key: 'pie',  label: 'Repartition' },
    { key: 'bar',  label: 'Performance' },
  ] as const;

  return (
    <View style={s.wrapper}>
      <View style={[s.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.statBox}>
          <Text style={[s.statLabel, { color: colors.subtext }]}>Investi</Text>
          <Text style={[s.statValue, { color: colors.text }]}>{totalInvested.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={[s.div, { backgroundColor: colors.border }]} />
        <View style={s.statBox}>
          <Text style={[s.statLabel, { color: colors.subtext }]}>Actuel</Text>
          <Text style={[s.statValue, { color: colors.primary }]}>{totalCurrent.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={[s.div, { backgroundColor: colors.border }]} />
        <View style={s.statBox}>
          <Text style={[s.statLabel, { color: colors.subtext }]}>+/-</Text>
          <Text style={[s.statValue, { color: isPositive ? colors.positive : colors.negative }]}>
            {isPositive ? '+' : ''}{gainLossPct.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={s.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity 
            key={t.key} 
            style={[s.tab, { backgroundColor: colors.card, borderColor: colors.border }, tab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary }]} 
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, { color: colors.subtext }, tab === t.key && { color: isDark ? '#0f172a' : '#ffffff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'line' && (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.chartTitle, { color: colors.subtext }]}>Evolution du portfolio (6 mois)</Text>
          <LineChart data={lineData()} width={W - 56} height={200} chartConfig={chartConfig}
            bezier style={s.chart} withInnerLines withOuterLines={false}
            formatYLabel={(v) => `${(parseInt(v) / 1000).toFixed(0)}k`} />
        </View>
      )}

      {tab === 'pie' && (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.chartTitle, { color: colors.subtext }]}>Repartition du portfolio</Text>
          <PieChart data={pieData()} width={W - 56} height={200} chartConfig={chartConfig}
            accessor="population" backgroundColor="transparent" paddingLeft="10" style={s.chart} />
        </View>
      )}

      {tab === 'bar' && (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.chartTitle, { color: colors.subtext }]}>Performance par action (%)</Text>
          <BarChart data={barData()} width={W - 56} height={200} yAxisLabel=""
            yAxisSuffix="%" chartConfig={chartConfig} style={s.chart}
            showValuesOnTopOfBars withInnerLines={false} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 16 },
  statsRow: { flexDirection: 'row', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  statBox: { flex: 1, alignItems: 'center' },
  div: { width: 1 },
  statLabel: { fontSize: 10, marginBottom: 4 },
  statValue: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tabActive: {  },
  tabText: { fontSize: 11, fontWeight: '600' },
  tabTextActive: { fontWeight: '700' },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  chartTitle: { fontSize: 12, fontWeight: '600', marginBottom: 12 },
  chart: { borderRadius: 8 },
});
