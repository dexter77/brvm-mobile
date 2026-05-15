import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  runOnJS 
} from "react-native-reanimated";
import apiClient from "../../src/api/client";
import { useTheme } from "../../src/context/ThemeContext";

const screenWidth = Dimensions.get("window").width;

type MarketItem = {
  symbol: string;
  name: string;
  sector: string;
  close: string;
  previous_close: string;
  variation: string;
  volume: number;
  date: string;
  logo_url?: string;
  description?: string;
};

export default function CompanyScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { symbol, name, sector, portfolioId } = useLocalSearchParams<{
    symbol: string;
    name?: string;
    sector?: string;
    portfolioId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<MarketItem | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [ownedInvestment, setOwnedInvestment] = useState<any>(null);
  const [period, setPeriod] = useState<string>("1M");
  const [selectedPoint, setSelectedPoint] = useState<{ value: number; index: number } | null>(null);

  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [fees, setFees] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [showTxModal, setShowTxModal] = useState(false);

  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [watchlistName, setWatchlistName] = useState("");
  const [following, setFollowing] = useState(false);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);

  // Gesture handling
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const isTouching = useSharedValue(false);
  const chartWidth = screenWidth - 64;
  const chartHeight = 220;

  const updatePointFromX = (x: number) => {
    if (!filteredHistory || filteredHistory.length < 2) return;
    const index = Math.max(0, Math.min(
      filteredHistory.length - 1,
      Math.floor((x / chartWidth) * filteredHistory.length)
    ));
    
    const values = filteredHistory.map(d => parseFloat(d.close));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const currentVal = values[index];
    
    // Calculate Y position
    const yPos = chartHeight - ((currentVal - min) / range * (chartHeight - 40)) - 20;
    touchY.value = yPos;

    if (selectedPoint?.index !== index) {
      setSelectedPoint({ 
        value: currentVal, 
        index 
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      isTouching.value = true;
      touchX.value = event.x;
      runOnJS(updatePointFromX)(event.x);
    })
    .onUpdate((event) => {
      touchX.value = event.x;
      runOnJS(updatePointFromX)(event.x);
    })
    .onEnd(() => {
      isTouching.value = false;
      runOnJS(setSelectedPoint)(null);
    })
    .onFinalize(() => {
      isTouching.value = false;
    });

  const fullScreenPanGesture = Gesture.Pan()
    .onStart((event) => {
      isTouching.value = true;
      touchX.value = event.x;
      runOnJS(updatePointFromX)(event.x);
    })
    .onUpdate((event) => {
      touchX.value = event.x;
      runOnJS(updatePointFromX)(event.x);
    })
    .onEnd(() => {
      isTouching.value = false;
      runOnJS(setSelectedPoint)(null);
    })
    .onFinalize(() => {
      isTouching.value = false;
    });

  const cursorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: touchX.value }],
      opacity: isTouching.value ? 1 : 0,
    };
  });

  const horizontalCursorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: touchY.value }],
      opacity: isTouching.value ? 1 : 0,
    };
  });

  const handleFollow = async () => {
    try {
      const res = await apiClient.get('/watchlists/');
      const lists = res.data;
      setWatchlists(lists);
      if (lists.length === 0) {
        setShowWatchlistModal(true);
      } else {
        setShowPickerModal(true);
      }
    } catch (e) {
      console.log("Watchlist error", e);
      Alert.alert("Erreur", "Impossible de récupérer les listes.");
    }
  };

  const handleAddToWatchlist = async (watchlistId: string, watchListName: string) => {
    try {
      const addRes = await apiClient.post(`/watchlists/${watchlistId}/add_item/`, { symbol });
      if (addRes.status === 201) {
        Alert.alert("✅ Succès", `Action ajoutée à la liste "${watchListName}".`);
        setFollowing(true);
      } else {
        Alert.alert("Information", "Cette action est déjà dans cette liste.");
      }
      setShowPickerModal(false);
    } catch(e) {
      Alert.alert("Erreur", "Impossible d'ajouter à la liste.");
    }
  };

  const handleCreateWatchlist = async () => {
    if (!watchlistName) return Alert.alert("Erreur", "Veuillez entrer un nom.");
    try {
      const res = await apiClient.post('/watchlists/', { name: watchlistName });
      const newId = res.data.id;
      const addRes = await apiClient.post(`/watchlists/${newId}/add_item/`, { symbol });
      Alert.alert("✅ Succès", "Liste créée et action ajoutée !");
      setShowWatchlistModal(false);
      setFollowing(true);
    } catch (e) {
      console.log("Create watchlist error", e);
      Alert.alert("Erreur", "Impossible de créer la liste.");
    }
  };

  const loadCompany = async (pId?: number) => {
    try {
      const portfoliosRes = await apiClient.get("/portfolios/");
      const portfoliosList = portfoliosRes.data || [];
      setPortfolios(portfoliosList);

      let currentPId = pId || selectedPortfolioId || (portfolioId ? parseInt(portfolioId, 10) : null);
      if (!currentPId && portfoliosList.length > 0) {
        const def = portfoliosList.find((p: any) => p.is_default) || portfoliosList[0];
        currentPId = def.id;
      }
      setSelectedPortfolioId(currentPId);

      const res = await apiClient.get<MarketItem[]>("/investments/market/");
      const all = res.data || [];

      const found = all.find(
        (item) =>
          item.symbol?.toUpperCase() === String(symbol || "").toUpperCase()
      );

      setData(
        found || {
          symbol: String(symbol || ""),
          name: String(name || symbol || ""),
          sector: String(sector || "N/A"),
          close: "0",
          previous_close: "0",
          variation: "0",
          volume: 0,
          date: new Date().toISOString(),
        }
      );

      try {
        const histRes = await apiClient.get(`/investments/market/${symbol}/history/`);
        setHistory(histRes.data || []);
      } catch (err) {
        console.error("load history error", err);
      }

      try {
        // Si on vient d'un Bedou spécifique, filtrer par ce Bedou
        // Sinon (depuis Explorer), chercher dans TOUS les Bedous
        const explicitPortfolioId = pId || (portfolioId ? parseInt(portfolioId, 10) : null);
        const invParams = explicitPortfolioId ? { params: { portfolio_id: explicitPortfolioId } } : {};
        const invRes = await apiClient.get("/investments/active/", invParams);
        const investments = invRes.data || [];
        const foundInv = investments.find((i: any) => i.symbol === String(symbol || "").toUpperCase());
        setOwnedInvestment(foundInv || null);
      } catch (err) {
        console.error("load investments error", err);
      }

      try {
        const txsRes = await apiClient.get("/transactions/");
        const txs = txsRes.data?.results || txsRes.data || [];
        const symbolUpper = String(symbol || "").toUpperCase();
        const filteredTxs = txs.filter((t: any) => 
          t.transaction_type === "INVESTMENT" && 
          (t.reference_number?.includes(`-${symbolUpper}-`) || t.description?.includes(` ${symbolUpper} `))
        );
        setMyTransactions(filteredTxs);
      } catch (err) {
        console.error("load transactions error", err);
      }
    } catch (e) {
      console.error("load company error", e);
      setData({
        symbol: String(symbol || ""),
        name: String(name || symbol || ""),
        sector: String(sector || "N/A"),
        close: "0",
        previous_close: "0",
        variation: "0",
        volume: 0,
        date: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, [symbol]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCompany();
  };

  const handleAddInvestment = async () => {
    if (!quantity || isNaN(parseFloat(quantity))) {
      Alert.alert("Quantité invalide", "Veuillez saisir un nombre de titres correct.");
      return;
    }

    if (!buyPrice || isNaN(parseFloat(buyPrice))) {
      Alert.alert("Prix invalide", "Veuillez saisir un prix d'achat correct.");
      return;
    }

    if (!selectedPortfolioId) {
      Alert.alert("Erreur", "Veuillez sélectionner un Bedou.");
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.post("/investments/", {
        symbol: data?.symbol,
        name: data?.name,
        investment_type: "STOCK",
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(buyPrice),
        purchase_date: new Date().toISOString().split("T")[0],
        fees: fees ? parseFloat(fees) : 0,
        portfolio: selectedPortfolioId,
      });

      Alert.alert("✅ Succès", `${data?.name} ajouté au Bedou`);
      setBuyModalVisible(false);
      setQuantity("");
      setBuyPrice("");
      setFees("");
      await loadCompany(selectedPortfolioId);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || "Erreur lors de l'ajout.";
      Alert.alert("❌ Erreur", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSell = async () => {
    const qty = parseFloat(sellQuantity);
    const sp  = parseFloat(sellPrice);

    if (!qty || qty <= 0) {
      Alert.alert("Quantité invalide", "Quantité invalide.");
      return;
    }
    if (!sp || sp <= 0) {
      Alert.alert("Prix invalide", "Prix de vente invalide.");
      return;
    }
    if (parseFloat(sellQuantity) > ownedQuantity) {
      Alert.alert("Titres insuffisants", `Vous ne possédez que ${ownedQuantity} titre(s) de cette action.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/investments/${ownedInvestment.id}/sell/`, {
        quantity: qty,
        sell_price: sp,
      });
      const credit = parseFloat(res.data.credit).toLocaleString("fr-FR");
      Alert.alert("✅ Vente confirmée", `${credit} FCFA crédités sur votre liquidité.`);
      setSellModalVisible(false);
      setSellQuantity("");
      setSellPrice("");
      await loadCompany();
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.error || "Impossible d'effectuer la vente.");
    } finally {
      setSubmitting(false);
    }
  };

  const price = useMemo(() => parseFloat(data?.close || "0"), [data]);
  const previousClose = useMemo(
    () => parseFloat(data?.previous_close || "0"),
    [data]
  );
  const variation = useMemo(() => parseFloat(data?.variation || "0"), [data]);
  const volume = useMemo(() => Number(data?.volume || 0), [data]);
  
  const ownedQuantity = useMemo(() => {
    if (!ownedInvestment || !ownedInvestment.quantity) return 0;
    return parseFloat(ownedInvestment.quantity);
  }, [ownedInvestment]);
  const ownedValue = ownedQuantity * price;

  const variationColor =
    variation > 0 ? "#10b981" : variation < 0 ? "#ff5252" : "#e5e7eb";

  const variationBg =
    variation > 0
      ? "rgba(16,185,129,0.15)"
      : variation < 0
      ? "rgba(255,82,82,0.2)"
      : "rgba(148,163,184,0.12)";

  const estimatedAmount = useMemo(() => {
    const q = parseFloat(quantity || "0");
    const p = parseFloat(buyPrice || "0");
    const f = parseFloat(fees || "0");
    if (!q || !p) return 0;
    return q * p + (f || 0);
  }, [quantity, buyPrice, fees]);

  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    // We base the cutoff from today, or the last available data point
    const lastDate = new Date(history[history.length - 1].date);
    const cutoff = new Date(lastDate);
    
    if (period === '1J') cutoff.setDate(cutoff.getDate() - 3); // 3 days to guarantee a start line
    else if (period === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
    else if (period === '1A') cutoff.setFullYear(cutoff.getFullYear() - 1);
    else if (period === '5A') cutoff.setFullYear(cutoff.getFullYear() - 5);
    else if (period === '10A') cutoff.setFullYear(cutoff.getFullYear() - 10);
    
    let filtered = history.filter(h => new Date(h.date) >= cutoff);
    
    // LineChart requires at least 2 points to draw a line
    if (filtered.length < 2 && history.length >= 2) {
      filtered = history.slice(-2);
    }
    return filtered.length > 0 ? filtered : history;
  }, [history, period]);

  const chartColorTheme = useMemo(() => {
    if (filteredHistory.length < 2) return { color: "#10b981", rgb: "16, 185, 129" }; // Green fallback
    const firstVal = parseFloat(filteredHistory[0].close);
    const lastVal = parseFloat(filteredHistory[filteredHistory.length - 1].close);
    if (lastVal >= firstVal) {
      return { color: "#10b981", rgb: "16, 185, 129" }; // Green
    } else {
      return { color: "#ff5252", rgb: "255, 82, 82" }; // Red
    }
  }, [filteredHistory]);

  if (loading || !data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            activeOpacity={0.8}
            disabled={refreshing}
          >
            <Text style={styles.refreshBtnText}>
              {refreshing ? "..." : "↻"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.headerLogoContainer}>
              {data.logo_url && (
                <View style={[styles.companyLogoHeaderBox, { overflow: 'hidden' }]}>
                  <Image 
                    source={{ uri: data.logo_url }} 
                    style={styles.companyLogoHeader} 
                    resizeMode="contain" 
                  />
                </View>
              )}
              <View style={styles.badgeBox}>
                <Text style={styles.badgeText}>{data.symbol}</Text>
              </View>
            </View>

            <View
              style={[
                styles.variationBadge,
                { backgroundColor: variationBg },
              ]}
            >
              <Text style={[styles.variationBadgeText, { color: variationColor }]}>
                {variation >= 0 ? "+" : ""}
                {variation.toFixed(2)}%
              </Text>
            </View>
          </View>

          <Text style={styles.companyName}>{data.name}</Text>
          <Text style={styles.companySector}>{data.sector}</Text>

          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Dernier cours</Text>
            <Text style={styles.priceValue}>
              {price.toLocaleString("fr-FR")} FCFA
            </Text>
            <Text style={styles.priceSub}>
              Précédent : {previousClose.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryAction, following && { backgroundColor: '#EEF2FF', borderColor: '#6366f1' }]}
              activeOpacity={0.8}
              onPress={handleFollow}
            >
              <Text style={[styles.secondaryActionText, following && { color: '#6366f1' }]}>{following ? "Suivi" : "Suivre"}</Text>
            </TouchableOpacity>

            {ownedQuantity > 0 && (
              <TouchableOpacity
                style={[styles.secondaryAction, { borderColor: '#ef4444' }]}
                activeOpacity={0.8}
                onPress={() => {
                  setSellPrice(price > 0 ? String(price) : "");
                  setSellQuantity(String(ownedQuantity));
                  setSellModalVisible(true);
                }}
              >
                <Text style={[styles.secondaryActionText, { color: '#ef4444' }]}>Vendre</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => {
                setBuyPrice(price > 0 ? String(price) : "");
                setBuyModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>Investir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {ownedQuantity > 0 && (
          <View 
            style={styles.ownedCard}
          >
            <View style={styles.ownedIconContainer}>
              <Text style={{ fontSize: 24 }}>💼</Text>
            </View>
            
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.ownedLabel}>Ma position</Text>
                {ownedInvestment?.portfolio_name && (
                  <View style={{ backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: '#818cf8', fontSize: 11, fontWeight: '700' }}>💼 {ownedInvestment.portfolio_name}</Text>
                  </View>
                )}
              </View>
              
              {/* Ligne 1: Titres et Somme */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.ownedValue}>
                  {ownedQuantity.toLocaleString("fr-FR")} titre{ownedQuantity > 1 ? "s" : ""}
                </Text>
                <Text style={styles.ownedAmount}>
                  {Math.round(ownedValue).toLocaleString("fr-FR")} FCFA
                </Text>
              </View>

              {/* Ligne 2: CMP et +/- Value */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: "600" }}>
                  CMP : {Math.round(parseFloat(ownedInvestment.purchase_price || "0")).toLocaleString("fr-FR")}
                </Text>
                {(() => {
                  const investedAmount = ownedQuantity * parseFloat(ownedInvestment.purchase_price || "0");
                  const gainLoss = ownedValue - investedAmount;
                  const gainLossPercent = investedAmount > 0 ? (gainLoss / investedAmount) * 100 : 0;
                  const color = gainLoss >= 0 ? "#10b981" : "#ff5252";
                  const sign = gainLoss > 0 ? "+" : "";

                  return (
                    <View style={{ 
                      backgroundColor: gainLoss >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 82, 82, 0.1)",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}>
                      <Text style={{ color, fontSize: 12, fontWeight: "bold" }}>
                        {sign}{Math.round(gainLoss).toLocaleString("fr-FR")} ({sign}{gainLossPercent.toFixed(2)}%)
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          </View>
        )}

        {history && history.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Historique des cours</Text>
                {selectedPoint && filteredHistory[selectedPoint.index] && (
                  <Text style={[styles.selectedPointText, { color: chartColorTheme.color }]}>
                    {new Date(filteredHistory[selectedPoint.index].date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })} : {selectedPoint.value.toLocaleString("fr-FR")} FCFA
                  </Text>
                )}
              </View>
              <View style={styles.periodTabs}>
                {['1J', '1M', '1A', '5A', '10A'].map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.periodTab, period === p && styles.periodTabActive]}
                    onPress={() => { setPeriod(p); setSelectedPoint(null); }}
                  >
                    <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ position: 'relative' }}>
              <TouchableOpacity 
                style={{ position: 'absolute', bottom: 20, right: 5, zIndex: 20, padding: 8 }}
                onPress={() => setIsFullScreen(true)}
              >
                <Ionicons name="expand" size={20} color={colors.primary} />
              </TouchableOpacity>

              <GestureDetector gesture={panGesture}>
                <Animated.View>
                  <LineChart
                    data={{
                      labels: filteredHistory.length > 5 
                        ? filteredHistory.filter((_, i) => i % Math.ceil(filteredHistory.length / 5) === 0).map(d => {
                            const dt = new Date(d.date);
                            return dt.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: period === '5A' || period === '10A' ? '2-digit' : undefined });
                          }) 
                        : filteredHistory.map(d => {
                            const dt = new Date(d.date);
                            return dt.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' });
                          }),
                      datasets: [
                         { data: filteredHistory.map(d => parseFloat(d.close)) }
                      ]
                    }}
                    width={screenWidth - 64}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    formatYLabel={(v) => {
                      const val = parseInt(v, 10);
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return String(val);
                    }}
                    withDots={false}
                    yLabelsOffset={25}
                    withInnerLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    withOuterLines={false}
                    chartConfig={{
                      backgroundColor: colors.background,
                      backgroundGradientFrom: colors.background,
                      backgroundGradientTo: colors.background,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(${chartColorTheme.rgb}, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                      propsForDots: { r: "0" }, 
                      propsForBackgroundLines: { 
                        strokeDasharray: "5", 
                        strokeWidth: 1,
                        stroke: colors.subtext, // Use subtext for better visibility
                        opacity: 0.2,
                      },
                      fillShadowGradient: chartColorTheme.color,
                      fillShadowGradientOpacity: 0.2,
                    }}
                    bezier
                    style={{
                      borderRadius: 16,
                      marginVertical: 8,
                    }}
                  />
                  {/* Ligne horizontale de sélection */}
                  <Animated.View 
                    style={[
                      styles.horizontalCursor, 
                      { backgroundColor: chartColorTheme.color },
                      horizontalCursorStyle
                    ]} 
                  />
                  {/* Ligne verticale de sélection */}
                  <Animated.View 
                    style={[
                      styles.verticalCursor, 
                      { backgroundColor: chartColorTheme.color },
                      cursorStyle
                    ]} 
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { marginRight: 8 }]}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statLabel}>Variation</Text>
            <Text style={[styles.statValue, { color: variationColor }]}>
              {variation >= 0 ? "+" : ""}
              {variation.toFixed(2)}%
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔄</Text>
            <Text style={styles.statLabel}>Volume</Text>
            <Text style={styles.statValue}>
              {volume.toLocaleString("fr-FR")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails marché</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Symbole</Text>
              <Text style={styles.detailValue}>{data.symbol}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Société</Text>
              <Text style={styles.detailValue}>{data.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Secteur</Text>
              <Text style={styles.detailValue}>{data.sector}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dernier cours</Text>
              <Text style={styles.detailValue}>
                {price.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cours précédent</Text>
              <Text style={styles.detailValue}>
                {previousClose.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Variation</Text>
              <Text style={[styles.detailValue, { color: variationColor }]}>
                {variation >= 0 ? "+" : ""}
                {variation.toFixed(2)}%
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Volume</Text>
              <Text style={styles.detailValue}>
                {volume.toLocaleString("fr-FR")}
              </Text>
            </View>

            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {new Date(data.date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé rapide</Text>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              {data.description || "Cette fiche te permet de consulter la valeur BRVM et d’ajouter rapidement cette ligne à ton Bedou personnel."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Watchlist Modal */}
      <Modal
        visible={showWatchlistModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWatchlistModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Créer une Liste</Text>
                <TouchableOpacity onPress={() => setShowWatchlistModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={{color: '#64748b', marginBottom: 15}}>
                Vous n'avez aucune liste de surveillance. Donnez-lui un nom pour la créer.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom de la liste</Text>
                <TextInput
                  style={styles.input}
                  value={watchlistName}
                  onChangeText={setWatchlistName}
                  placeholder="Ex: Top Actions, Banques..."
                  placeholderTextColor="#9ca3af"
                  returnKeyType="done"
                  onSubmitEditing={handleCreateWatchlist}
                />
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#f1f5f9', flex: 1, marginRight: 8 }]}
                  onPress={() => setShowWatchlistModal(false)}
                >
                  <Text style={{ color: '#0f172a', fontWeight: '600', textAlign: 'center' }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#38bdf8', flex: 1, marginLeft: 8 }]}
                  onPress={handleCreateWatchlist}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Créer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Watchlist Picker Modal */}
      <Modal
        visible={showPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter à une liste</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 250, marginBottom: 16 }}>
              {watchlists.map((list: any) => (
                <TouchableOpacity 
                  key={list.id} 
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#334155', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => handleAddToWatchlist(list.id, list.name)}
                >
                  <Ionicons name="list" size={20} color="#38bdf8" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#f8fafc', fontWeight: '500' }}>{list.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }]}
              onPress={() => {
                setShowPickerModal(false);
                setShowWatchlistModal(true);
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '600', textAlign: 'center' }}>+ Créer une nouvelle liste</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Plein Écran Graphique */}
      <Modal
        visible={isFullScreen}
        animationType="fade"
        transparent={false}
      >
        <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            width: Dimensions.get('window').height - 80, 
            height: Dimensions.get('window').width - 60, 
            transform: [{ rotate: '90deg' }],
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <TouchableOpacity 
              style={{ position: 'absolute', top: 20, right: 40, zIndex: 30 }}
              onPress={() => setIsFullScreen(false)}
            >
              <Ionicons name="close-circle" size={36} color={colors.primary} />
            </TouchableOpacity>

            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 20 }}>
              Historique {data?.symbol} ({period})
            </Text>

            {(() => {
              const fsValues = filteredHistory.map(d => parseFloat(d.close));
              const fsMin = Math.min(...fsValues);
              const fsMax = Math.max(...fsValues);
              const fsWidth = Dimensions.get('window').height - 100;
              const fsHeight = Dimensions.get('window').width - 120;

              return (
                <GestureDetector gesture={fullScreenPanGesture}>
                  <Animated.View style={{ position: 'relative' }}>
                    {/* Custom Y-axis labels for High/Low - moved INSIDE to avoid status bar */}
                    <View style={{ 
                      position: 'absolute', 
                      left: 10, 
                      top: 15, 
                      bottom: 35, 
                      justifyContent: 'space-between', 
                      zIndex: 20 
                    }}>
                      <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', paddingHorizontal: 4, borderRadius: 4 }}>
                        <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '800' }}>{fsMax.toLocaleString()}</Text>
                      </View>
                      <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', paddingHorizontal: 4, borderRadius: 4 }}>
                        <Text style={{ color: '#ff5252', fontSize: 11, fontWeight: '800' }}>{fsMin.toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* High/Low horizontal lines */}
                    <View style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 1, backgroundColor: '#22c55e', opacity: 0.3, borderStyle: 'dashed', borderWidth: 0.5, zIndex: 1 }} />
                    <View style={{ position: 'absolute', bottom: 42, left: 0, right: 0, height: 1, backgroundColor: '#ff5252', opacity: 0.3, borderStyle: 'dashed', borderWidth: 0.5, zIndex: 1 }} />

                    <LineChart
                      data={{
                        labels: filteredHistory.map((_, i) => i % Math.ceil(filteredHistory.length / 10) === 0 ? "" : ""),
                        datasets: [{ data: filteredHistory.map(d => parseFloat(d.close)) }]
                      }}
                      width={fsWidth}
                      height={fsHeight}
                      chartConfig={{
                        backgroundColor: colors.background,
                        backgroundGradientFrom: colors.background,
                        backgroundGradientTo: colors.background,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(${chartColorTheme.rgb}, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                        propsForDots: { r: "0" },
                        propsForBackgroundLines: { 
                          strokeDasharray: "5", 
                          strokeWidth: 1,
                          stroke: colors.subtext,
                          opacity: 0.1,
                        },
                        fillShadowGradient: chartColorTheme.color,
                        fillShadowGradientOpacity: 0.2,
                      }}
                      bezier
                      style={{ borderRadius: 16 }}
                      withDots={false}
                      withInnerLines={true}
                      withVerticalLines={false}
                      withHorizontalLines={true}
                      withOuterLines={false}
                      withHorizontalLabels={false} // Hide default Y labels
                    />
                    <Animated.View style={[styles.verticalCursor, { backgroundColor: chartColorTheme.color }, cursorStyle]} />
                    <Animated.View style={[styles.horizontalCursor, { backgroundColor: chartColorTheme.color, width: fsWidth }, horizontalCursorStyle]} />
                  </Animated.View>
                </GestureDetector>
              );
            })()}

            <View style={{ flexDirection: 'row', marginTop: 20, gap: 15 }}>
              {['1J', '1M', '1A', '5A', '10A'].map((p) => (
                <TouchableOpacity 
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: period === p ? colors.primary : colors.card }}
                >
                  <Text style={{ color: period === p ? '#fff' : colors.subtext, fontWeight: '600' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Vente */}
      <Modal
        visible={sellModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSellModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Vendre {data?.symbol}</Text>
                <TouchableOpacity onPress={() => setSellModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#94a3b8', marginBottom: 20, fontSize: 13 }}>
                Vous détenez {ownedQuantity} titre{ownedQuantity > 1 ? 's' : ''}. Valeur marchande : {Math.round(ownedValue).toLocaleString('fr-FR')} FCFA.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantité à vendre</Text>
                <TextInput
                  style={styles.input}
                  value={sellQuantity}
                  onChangeText={setSellQuantity}
                  placeholder="Ex: 5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Prix de vente unitaire (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  placeholder="Cours actuel"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSell}
                />
              </View>

              {sellQuantity && sellPrice && (
                <View style={{ backgroundColor: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Montant estimé à recevoir</Text>
                  <Text style={{ color: '#10b981', fontSize: 20, fontWeight: '700', marginTop: 4 }}>
                    {(parseFloat(sellQuantity || '0') * parseFloat(sellPrice || '0')).toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#ef4444', marginTop: 10, opacity: submitting ? 0.6 : 1 }]}
                onPress={handleSell}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirmer la vente</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 15, alignItems: 'center' }}
                onPress={() => setSellModalVisible(false)}
              >
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={buyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBuyModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Ajouter au Bedou</Text>
                  <TouchableOpacity
                    onPress={() => setBuyModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Sélectionner le Bedou</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                  {portfolios.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.quickBtn,
                        selectedPortfolioId === p.id && { borderColor: colors.primary, backgroundColor: colors.primary + '22' }
                      ]}
                      onPress={() => setSelectedPortfolioId(p.id)}
                    >
                      <Text style={[styles.quickBtnText, selectedPortfolioId === p.id && { color: colors.primary, fontWeight: '700' }]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Symbole</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={data.symbol}
                  editable={false}
                  placeholderTextColor="#64748b"
                />

                <Text style={styles.label}>Société</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={data.name}
                  editable={false}
                  placeholderTextColor="#64748b"
                />

                <Text style={styles.label}>Quantité</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="ex : 10"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  returnKeyType="done"
                />

                <Text style={styles.label}>Prix d'achat unitaire (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={buyPrice}
                  onChangeText={setBuyPrice}
                  placeholder="ex : 18500"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  returnKeyType="done"
                />

                <Text style={styles.label}>Frais (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={fees}
                  onChangeText={setFees}
                  placeholder="ex : 500"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  returnKeyType="done"
                />

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Montant estimé</Text>
                  <Text style={styles.summaryValue}>
                    {estimatedAmount.toLocaleString("fr-FR")} FCFA
                  </Text>
                </View>

                <View style={styles.quickAmounts}>
                  {["1", "5", "10", "20"].map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickBtn}
                      onPress={() => setQuantity(q)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.quickBtnText}>{q} titres</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    submitting && styles.submitBtnDisabled,
                  ]}
                  onPress={handleAddInvestment}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Ajouter</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Historique des Transactions */}
      <Modal
        visible={showTxModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTxModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historique d'achat - {data.symbol}</Text>
              <TouchableOpacity
                onPress={() => setShowTxModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {myTransactions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 16 }}>Aucune transaction trouvée</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {myTransactions.map(tx => (
                  <View key={tx.id} style={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: 12, 
                    padding: 16, 
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#334155'
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: '#f1f5f9', fontWeight: 'bold' }}>
                        {tx.description.split(' de ')[0] || "Ordre"}
                      </Text>
                      <Text style={{ color: '#10b981', fontWeight: 'bold' }}>
                        {Math.round(parseFloat(tx.amount || 0)).toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                    <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                      {tx.description}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#64748b', fontSize: 11 }}>
                        {tx.reference_number || "Achat"}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 11 }}>
                        {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtnText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "700",
  },

  heroCard: {
    backgroundColor: "#8b5cf6",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  headerLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  companyLogoHeaderBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    padding: 6,
  },
  companyLogoHeader: {
    width: "100%",
    height: "100%",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badgeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  variationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  variationBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  companyName: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  companySector: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    marginBottom: 20,
  },
  priceBlock: {
    marginBottom: 18,
  },
  priceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 6,
  },
  priceValue: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
  },
  priceSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.22)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 10,
  },
  secondaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  primaryAction: {
    flex: 1,
    backgroundColor: "#312e81",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  
  ownedCard: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  ownedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  ownedLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  ownedValue: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "800",
  },
  ownedAmount: {
    color: "#38bdf8",
    fontSize: 15,
    fontWeight: "800",
  },

  statsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 8,
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "700",
  },

  chartCard: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 16,
    paddingBottom: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    marginLeft: 4,
  },
  chartTitle: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedPointText: {
    fontSize: 12,
    fontWeight: "600",
  },
  periodTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.5)",
    borderRadius: 8,
    padding: 2,
  },
  periodTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodTabActive: {
    backgroundColor: "#334155",
  },
  periodTabText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  periodTabTextActive: {
    color: "#f1f5f9",
  },

  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  detailCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  detailRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "600",
  },

  noteCard: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  noteText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },
  verticalCursor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 10,
    opacity: 0.5,
  },
  horizontalCursor: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
    opacity: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    color: "#94a3b8",
    fontSize: 20,
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f1f5f9",
    fontSize: 14,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  summaryBox: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
  },
  summaryLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#0f172a",
  },
  quickBtnText: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: "#8b5cf6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
