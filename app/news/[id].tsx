import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient from '../../src/api/client';

type NewsDetail = {
  id: number;
  title: string;
  summary: string;
  content: string;
  conclusion: string;
  category: string;
  company: string;
  source: string;
  boc_date: string;
  created_at: string;
};

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  REPORT:     { label: "Rapport d'activité", icon: '📊', color: '#a78bfa' },
  DIVIDEND:   { label: 'Dividende',           icon: '💰', color: '#10b981' },
  ASSEMBLY:   { label: 'Assemblée Générale',  icon: '🏛️', color: '#f59e0b' },
  RATING:     { label: 'Notation',            icon: '⭐', color: '#06b6d4' },
  MARKET:     { label: 'Marché',              icon: '📈', color: '#38bdf8' },
  COMPANY:    { label: 'Entreprise',          icon: '🏢', color: '#818cf8' },
  ECONOMY:    { label: 'Économie',            icon: '🌍', color: '#34d399' },
  REGULATION: { label: 'Réglementation',      icon: '⚖️', color: '#fb923c' },
};

const INVESTOR_TIPS: Record<string, string[]> = {
  REPORT:     ['Comparez le ROE aux années précédentes', 'Analysez l\'évolution du PNB', 'Vérifiez le ratio de distribution de dividendes'],
  DIVIDEND:   ['Calculez le rendement : dividende / cours actuel', 'Vérifiez la date de détachement', 'Comparez au taux directeur de la BCEAO'],
  ASSEMBLY:   ['Lisez l\'ordre du jour complet', 'Votez ou suivez les résolutions', 'Notez les décisions sur la gouvernance'],
  RATING:     ['Une note élevée = risque faible = coût de financement bas', 'Suivez les changements de perspective', 'Impact potentiel sur le cours à court terme'],
  MARKET:     ['Croisez volume et prix pour confirmer la tendance', 'Identifiez les supports et résistances', 'Restez discipliné face à la volatilité'],
  COMPANY:    ['Évaluez l\'impact stratégique à 12-24 mois', 'Vérifiez l\'alignement avec votre thèse d\'investissement', 'Consultez les annonces officielles de la BRVM'],
  ECONOMY:    ['Contexte macro = fond de Bedou', 'Favorisez les secteurs résilients en période d\'incertitude', 'La croissance UEMOA profite aux bancaires et télécoms'],
  REGULATION: ['Anticipez les coûts de mise en conformité', 'Identifiez les sociétés bien positionnées', 'Les leaders de secteur absorbent mieux les contraintes réglementaires'],
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 20);
}

export default function NewsDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get(`/boc-news/${id}/`);
        setItem(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleShare = async () => {
    if (!item) return;
    await Share.share({
      title: item.title,
      message: `${item.title}\n\n${item.summary}\n\nSource: ${item.source}`,
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={{ color: '#94a3b8', fontSize: 16 }}>Article introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#38bdf8' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cat = CATEGORIES[item.category] || CATEGORIES.COMPANY;
  const tips = INVESTOR_TIPS[item.category] || INVESTOR_TIPS.COMPANY;
  const paragraphs = splitParagraphs(item.content);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.navBackIcon}>←</Text>
          <Text style={styles.navBackText}>Actualités</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareBtnText}>Partager</Text>
          <Text style={{ fontSize: 14 }}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Hero */}
        <View style={[styles.hero, { borderTopColor: cat.color }]}>
          {/* Badge catégorie */}
          <View style={[styles.catBadge, { backgroundColor: cat.color + '18', borderColor: cat.color + '40' }]}>
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label.toUpperCase()}</Text>
          </View>

          {/* Titre */}
          <Text style={styles.heroTitle}>{item.title}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            {item.company && item.company !== 'BRVM' && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>🏢 {item.company}</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>📅 {formatDate(item.boc_date)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>📄 {item.source}</Text>
            </View>
          </View>
        </View>

        {/* Résumé encadré */}
        <View style={[styles.summaryBox, { borderLeftColor: cat.color }]}>
          <Text style={styles.summaryLabel}>EN BREF</Text>
          <Text style={styles.summaryText}>{item.summary}</Text>
        </View>

        {/* Contenu complet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Détails complets</Text>
          <View style={styles.contentCard}>
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <Text key={i} style={[styles.paragraph, i > 0 && { marginTop: 12 }]}>
                  {p}
                </Text>
              ))
            ) : (
              <Text style={styles.paragraph}>{item.content}</Text>
            )}
          </View>
        </View>

        {/* Séparateur */}
        <View style={styles.divider} />

        {/* Conclusion investisseur */}
        <View style={styles.section}>
          <View style={styles.conclusionHeader}>
            <Text style={styles.sectionTitle}>💡 Analyse investisseur</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>BOC BRVM</Text>
            </View>
          </View>

          <View style={[styles.conclusionCard, { borderColor: cat.color + '40' }]}>
            <View style={[styles.conclusionIcon, { backgroundColor: cat.color + '15' }]}>
              <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
            </View>
            <Text style={styles.conclusionText}>{item.conclusion}</Text>
          </View>

          {/* Tips pratiques */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>📌 Points clés à surveiller</Text>
            {tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: cat.color }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer source */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Source officielle : {item.source}
          </Text>
          <Text style={styles.footerSub}>
            Les informations présentées sont extraites du Bulletin Officiel de la Cote (BOC) de la BRVM.
            Elles ne constituent pas un conseil en investissement.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Navbar */
  navbar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  navBack:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBackIcon:  { color: '#38bdf8', fontSize: 18 },
  navBackText:  { color: '#38bdf8', fontSize: 14, fontWeight: '600' },
  shareBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  shareBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

  /* Hero */
  hero: {
    paddingHorizontal: 20, paddingVertical: 24,
    borderTopWidth: 3,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  catBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 14 },
  catIcon:   { fontSize: 14 },
  catLabel:  { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 16 },
  metaRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip:  { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#334155' },
  metaChipText: { color: '#64748b', fontSize: 10, fontWeight: '600' },

  /* Résumé */
  summaryBox:  { marginHorizontal: 20, marginVertical: 20, padding: 16, backgroundColor: '#1e293b', borderRadius: 12, borderLeftWidth: 4 },
  summaryLabel: { color: '#475569', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  summaryText:  { color: '#cbd5e1', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  /* Sections */
  section:       { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle:  { color: '#f1f5f9', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  contentCard:   { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  paragraph:     { color: '#94a3b8', fontSize: 13, lineHeight: 20 },

  divider: { height: 1, backgroundColor: '#1e293b', marginHorizontal: 20, marginBottom: 24 },

  /* Conclusion */
  conclusionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aiBadge:          { backgroundColor: '#38bdf810', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: '#38bdf830' },
  aiBadgeText:      { color: '#38bdf8', fontSize: 9, fontWeight: '700' },
  conclusionCard:   { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  conclusionIcon:   { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  conclusionText:   { flex: 1, color: '#e2e8f0', fontSize: 13, lineHeight: 21 },

  tipsCard:  { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  tipsTitle: { color: '#f1f5f9', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  tipText:   { flex: 1, color: '#94a3b8', fontSize: 12, lineHeight: 18 },

  /* Footer */
  footer:    { marginHorizontal: 20, padding: 16, backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 20 },
  footerText: { color: '#475569', fontSize: 10, fontWeight: '700', marginBottom: 6 },
  footerSub:  { color: '#334155', fontSize: 10, lineHeight: 15 },
});
