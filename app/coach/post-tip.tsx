import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';

const TIP_TYPES = [
  { value: 'ACHETER', label: 'Acheter', color: '#10b981', icon: 'trending-up' },
  { value: 'CONSERVER', label: 'Conserver', color: '#f59e0b', icon: 'pause' },
  { value: 'VENDRE', label: 'Vendre', color: '#ef4444', icon: 'trending-down' },
];

export default function PostTipScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [symbols, setSymbols] = useState<any[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(true);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [tipType, setTipType] = useState('ACHETER');
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSymbols();
  }, []);

  const fetchSymbols = async () => {
    try {
      const res = await apiClient.get('/investments/market/');
      setSymbols(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSymbols(false);
    }
  };

  const filteredSymbols = symbols.filter(s => 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const handleSubmit = async () => {
    if (!symbol || !reason) {
      Alert.alert('Champs requis', 'Veuillez sélectionner une action et donner votre analyse.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/coaches/post-tip/', {
        symbol: symbol.toUpperCase(),
        tip_type: tipType,
        reason,
      });
      Alert.alert('✅ Succès', 'Votre recommandation a été publiée !', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de publier la recommandation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Nouvelle Recommandation</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.label, { color: colors.text }]}>Action concernée</Text>
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
            <Ionicons name="search" size={20} color={colors.subtext} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher un symbole (ex: CFACC)..."
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (!text) setSymbol('');
              }}
            />
          </View>

          {searchQuery.length > 0 && symbol === '' && (
            <View style={[styles.resultsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {loadingSymbols ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ padding: 10 }} />
              ) : (
                filteredSymbols.map((s) => (
                  <TouchableOpacity 
                    key={s.symbol} 
                    style={styles.resultItem}
                    onPress={() => {
                      setSymbol(s.symbol);
                      setSearchQuery(s.symbol);
                    }}
                  >
                    <Text style={[styles.resultSymbol, { color: colors.text }]}>{s.symbol}</Text>
                    <Text style={[styles.resultName, { color: colors.subtext }]} numberOfLines={1}>{s.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {symbol !== '' && (
            <View style={[styles.selectedSymbolBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Text style={[styles.selectedSymbolText, { color: colors.primary }]}>Action sélectionnée : {symbol}</Text>
              <TouchableOpacity onPress={() => { setSymbol(''); setSearchQuery(''); }}>
                <Ionicons name="close-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.label, { color: colors.text }]}>Votre recommandation</Text>
          <View style={styles.tipTypeRow}>
            {TIP_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.tipTypeBtn,
                  { borderColor: colors.border },
                  tipType === type.value && { backgroundColor: type.color, borderColor: type.color }
                ]}
                onPress={() => setTipType(type.value)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={18} 
                  color={tipType === type.value ? '#fff' : colors.subtext} 
                />
                <Text style={[
                  styles.tipTypeLabel, 
                  { color: tipType === type.value ? '#fff' : colors.subtext }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Analyse & Justification</Text>
          <TextInput
            style={[
              styles.textArea, 
              { 
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9', 
                color: colors.text, 
                borderColor: colors.border 
              }
            ]}
            placeholder="Pourquoi recommandez-vous cette action ? (fondamentaux, graphiques, dividendes...)"
            placeholderTextColor={colors.subtext}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity
            style={[
              styles.submitBtn, 
              { backgroundColor: colors.primary },
              (submitting || !symbol || !reason) && { opacity: 0.6 }
            ]}
            onPress={handleSubmit}
            disabled={submitting || !symbol || !reason}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Publier la recommandation</Text>
            )}
          </TouchableOpacity>

          <View style={styles.disclaimerBox}>
            <Ionicons name="alert-circle" size={16} color={colors.subtext} />
            <Text style={styles.disclaimerText}>
              Votre recommandation sera visible par tous les membres du Club. Elle ne constitue pas une obligation d'achat pour eux.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  backBtn: { padding: 5 },
  title: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 12, marginTop: 20 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 50,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  resultsContainer: {
    marginTop: 5,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultSymbol: { fontWeight: '800', fontSize: 14 },
  resultName: { fontSize: 12, flex: 1, marginLeft: 10, textAlign: 'right' },
  selectedSymbolBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  selectedSymbolText: { fontWeight: '700', fontSize: 14 },
  tipTypeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  tipTypeBtn: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tipTypeLabel: { fontSize: 12, fontWeight: '700' },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    height: 150,
    fontSize: 15,
    lineHeight: 22,
  },
  submitBtn: {
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    gap: 8,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#94a3b8', lineHeight: 16 },
});
