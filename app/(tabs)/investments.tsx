import React, { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Image,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import apiClient from "../../src/api/client";
import { useTheme } from "../../src/context/ThemeContext";

type MarketItem = {
  symbol: string;
  name: string;
  sector: string;
  close: string;
  previous_close: string;
  variation: string;
  volume: number;
  date: string;
};

const SECTORS = [
  { id: "ALL", label: "Tous les secteurs", icon: "🌍" },
  { id: "Utilities", label: "Services publics", icon: "💡" },
  { id: "Financials", label: "Services financiers", icon: "🏦" },
  { id: "Consumer Goods", label: "Biens de conso", icon: "🛒" },
  { id: "Consumer Services", label: "Services conso", icon: "🎯" },
  { id: "Oil Gas", label: "Pétrole & gaz", icon: "⛽️" },
  { id: "Industrials", label: "Industriels", icon: "🏭" },
  { id: "Basic Materials", label: "Matériaux", icon: "⚙️" },
  { id: "Telecom", label: "Télécoms", icon: "📡" },
];

function getSectorIcon(sector: string): string {
  switch (sector) {
    case "Utilities":
      return "💡";
    case "Financials":
      return "🏦";
    case "Consumer Goods":
      return "🛒";
    case "Consumer Services":
      return "🎯";
    case "Oil Gas":
      return "⛽️";
    case "Industrials":
      return "🏭";
    case "Basic Materials":
      return "⚙️";
    case "Telecom":
      return "📡";
    default:
      return "📈";
  }
}

export default function InvestmentsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadMarket = async () => {
    try {
      const res = await apiClient.get("investments/market/");
      const allData = res.data || [];
      // On filtre pour ne garder que les entreprises (pas les indices)
      const companiesOnly = allData.filter((item: any) => 
        !["BRVMC", "BRVM30", "BRVMP"].includes(item.symbol)
      );
      setMarketData(companiesOnly);
    } catch (e) {
      console.error("loadMarket error", e);
      setMarketData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarket();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarket();
    setRefreshing(false);
  };

  const topGainers = useMemo(
    () =>
      [...marketData]
        .filter((item) => parseFloat(item.variation || "0") > 0)
        .sort(
          (a, b) =>
            parseFloat(b.variation || "0") - parseFloat(a.variation || "0")
        )
        .slice(0, 5),
    [marketData]
  );

  const topLosers = useMemo(
    () =>
      [...marketData]
        .filter((item) => parseFloat(item.variation || "0") < 0)
        .sort(
          (a, b) =>
            parseFloat(a.variation || "0") - parseFloat(b.variation || "0")
        )
        .slice(0, 5),
    [marketData]
  );

  const filteredCompanies = useMemo(() => {
    return marketData.filter((item) => {
      const matchSector =
        selectedSector === "ALL" || item.sector === selectedSector;

      const q = search.trim().toLowerCase();
      if (!q) return matchSector;

      return (
        matchSector &&
        (item.name.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q))
      );
    });
  }, [marketData, selectedSector, search]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={[styles.title, { color: colors.text }]}>📈 Marché BRVM</Text>
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
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >

        {/* Top 5 hausses */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Les meilleures actions d&apos;aujourd&apos;hui
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {topGainers.length === 0 ? (
            <Text style={styles.emptyInline}>Aucune hausse disponible</Text>
          ) : (
            topGainers.map((item) => {
              const price = parseFloat(item.close || "0");
              const variation = parseFloat(item.variation || "0");
              return (
                <TouchableOpacity
                  key={`g-${item.symbol}`}
                  style={[styles.actionCard, { borderColor: "#22c55e", backgroundColor: colors.card }]}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/company/[symbol]",
                      params: {
                        symbol: item.symbol,
                        name: item.name,
                        sector: item.sector,
                      },
                    } as any)
                  }
                >
                  <View style={[styles.logoCircle, { borderColor: "#22c55e" }]}>
                    {(item as any).logo_url ? (
                      <Image 
                        source={{ uri: (item as any).logo_url }} 
                        style={styles.logoImageSmall} 
                        resizeMode="contain" 
                        defaultSource={require("../../assets/images/favicon.png")} // Fallback optionnel
                      />
                    ) : (
                      <Text style={[styles.logoLetter, { color: colors.text }]}>
                        {item.symbol?.charAt(0) || "?"}
                      </Text>
                    )}
                  </View>

                  <View style={styles.symbolRow}>
                    <Text style={[styles.symbolText, { color: colors.text }]}>{item.symbol}</Text>
                    <Text style={styles.variationGain}>
                      +{variation.toFixed(2)}%
                    </Text>
                  </View>

                  <Text style={styles.companyName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  <Text style={[styles.priceText, { color: colors.text }]}>
                    {price ? price.toLocaleString("fr-FR") : "0"} CFA
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Fortes baisses */}
        <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Fortes baisses</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {topLosers.length === 0 ? (
            <Text style={styles.emptyInline}>Aucune baisse disponible</Text>
          ) : (
            topLosers.map((item) => {
              const price = parseFloat(item.close || "0");
              const variation = parseFloat(item.variation || "0");
              return (
                <TouchableOpacity
                  key={`l-${item.symbol}`}
                  style={[styles.actionCard, { borderColor: "#ef4444", backgroundColor: colors.card }]}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/company/[symbol]",
                      params: {
                        symbol: item.symbol,
                        name: item.name,
                        sector: item.sector,
                      },
                    } as any)
                  }
                >
                  <View style={[styles.logoCircle, { borderColor: "#ef4444" }]}>
                    {(item as any).logo_url ? (
                      <Image 
                        source={{ uri: (item as any).logo_url }} 
                        style={styles.logoImageSmall} 
                        resizeMode="contain" 
                      />
                    ) : (
                      <Text style={[styles.logoLetter, { color: colors.text }]}>
                        {item.symbol?.charAt(0) || "?"}
                      </Text>
                    )}
                  </View>

                  <View style={styles.symbolRow}>
                    <Text style={[styles.symbolText, { color: colors.text }]}>{item.symbol}</Text>
                    <Text style={styles.variationLoss}>
                      {variation.toFixed(2)}%
                    </Text>
                  </View>

                  <Text style={styles.companyName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  <Text style={[styles.priceText, { color: colors.text }]}>
                    {price ? price.toLocaleString("fr-FR") : "0"} CFA
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Filtres secteurs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectorRow}
        >
          {SECTORS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.sectorBtn,
                selectedSector === s.id && styles.sectorBtnActive,
              ]}
              onPress={() => setSelectedSector(s.id)}
            >
              <Text
                style={[
                  styles.sectorText,
                  selectedSector === s.id && styles.sectorTextActive,
                ]}
              >
                {s.icon} {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recherche */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 16 }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, flex: 1, height: 44, borderWidth: 0 }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une société ou un symbole"
            placeholderTextColor={colors.subtext}
            autoCapitalize="characters"
          />
          {search.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearch("")}
              style={styles.clearButton}
            >
              <Text style={{ color: colors.subtext, fontSize: 18, fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Liste complète des sociétés */}
        <View style={styles.list}>
          {filteredCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>
                Aucune société pour ce secteur
              </Text>
            </View>
          ) : (
            filteredCompanies.map((company) => {
              const price = parseFloat(company.close || "0");
              const variation = parseFloat(company.variation || "0");
              return (
                <TouchableOpacity
                  key={company.symbol}
                  style={styles.companyCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/company/[symbol]",
                      params: {
                        symbol: company.symbol,
                        name: company.name,
                        sector: company.sector,
                      },
                    } as any)
                  }
                >
                  <View style={styles.companyLeft}>
                    <View style={styles.companyLogoBox}>
                      {(company as any).logo_url ? (
                        <Image
                          source={{ uri: (company as any).logo_url }}
                          style={styles.companyLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.companyIcon}>
                          {getSectorIcon(company.sector)}
                        </Text>
                      )}
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={styles.companyNameMain} numberOfLines={1}>
                        {company.name}
                      </Text>
                      <Text style={styles.companySymbol}>
                        {company.symbol}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.companyRight}>
                    <Text style={styles.companyPrice}>
                      {price ? price.toLocaleString("fr-FR") : "0"} CFA
                    </Text>
                    <Text
                      style={[
                        styles.companyVariation,
                        variation >= 0 ? styles.positive : styles.negative,
                      ]}
                    >
                      {variation >= 0 ? "+" : ""}
                      {variation.toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" }, // fond initial
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },

  header: { paddingHorizontal: 16, paddingVertical: 16 },
  supportBtn: {
    padding: 8,
    borderRadius: 12,
  },
  title: { color: "#f1f5f9", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#94a3b8", fontSize: 12, marginTop: 4 },

  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
  },
  sectionTitle: { color: "#f1f5f9", fontSize: 16, fontWeight: "700" },

  cardsRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  actionCard: {
    width: 180,
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  actionCardGain: {
    borderColor: "#22c55e",
    backgroundColor: "#022c22",
  },
  actionCardLoss: {
    borderColor: "#ef4444",
    backgroundColor: "#2b0b0b",
  },

  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  logoBoxHorizontal: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  logoImageSmall: {
    width: "85%",
    height: "85%",
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
  },

  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  symbolText: { fontSize: 14, fontWeight: "700", color: "#f9fafb" },
  variationGain: { fontSize: 13, fontWeight: "700", color: "#22c55e" },
  variationLoss: { fontSize: 13, fontWeight: "700", color: "#f97373" },

  companyName: { fontSize: 12, color: "#cbd5f5", marginBottom: 6 },
  priceText: { fontSize: 13, fontWeight: "700", color: "#e5e7eb" },

  emptyInline: { color: "#64748b", fontSize: 12 },

  sectorRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectorBtnActive: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },
  sectorText: { color: "#cbd5e1", fontSize: 12, fontWeight: "600" },
  sectorTextActive: { color: "#0f172a" },

  searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchInput: {
    backgroundColor: "#020617",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 13,
  },
  clearButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: "#64748b", fontSize: 14 },

  companyCard: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  companyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  companyLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  companyLogo: {
    width: "85%",
    height: "85%",
  },
  companyIcon: { fontSize: 20 },
  companyNameMain: { color: "#f1f5f9", fontSize: 15, fontWeight: "600" },
  companySymbol: { color: "#94a3b8", fontSize: 13, marginTop: 2, fontWeight: "500" },
  companySector: { color: "#64748b", fontSize: 11, marginTop: 2 },

  companyRight: { alignItems: "flex-end" },
  companyPrice: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  companyVariation: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  positive: { color: "#22c55e" },
  negative: { color: "#ff5252" },
});
