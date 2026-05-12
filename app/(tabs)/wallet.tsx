import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart, PieChart } from "react-native-chart-kit";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  runOnJS 
} from "react-native-reanimated";
import { router } from "expo-router";
import apiClient from "../../src/api/client";
import { useTheme } from "../../src/context/ThemeContext";

const screenWidth = Dimensions.get("window").width;

type Transaction = {
  id: number;
  transaction_type: string;
  status: string;
  amount: string;
  currency: string;
  description: string;
  reference_number: string;
  fee: string;
  portfolio_name: string;
  created_at: string;
};

const TYPE_CONFIG: any = {
  DEPOSIT: { icon: "⬇️", label: "Dépôt", color: "#10b981" },
  WITHDRAWAL: { icon: "⬆️", label: "Retrait", color: "#ff5252" },
  TRANSFER: { icon: "↔️", label: "Transfert", color: "#38bdf8" },
  INVESTMENT: { icon: "📈", label: "Investissement", color: "#a78bfa" },
  DIVIDEND: { icon: "💰", label: "Dividende", color: "#f59e0b" },
};

const STATUS_CONFIG: any = {
  COMPLETED: { label: "Complétée", color: "#10b981" },
  PENDING: { label: "En attente", color: "#f59e0b" },
  FAILED: { label: "Échouée", color: "#ff5252" },
  CANCELLED: { label: "Annulée", color: "#64748b" },
};

const SECTOR_COLORS = [
  "#38bdf8", "#a78bfa", "#fb7185", "#fbbf24", "#34d399", "#818cf8", "#f472b6", "#94a3b8"
];


export default function WalletScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState("1M");
  const [selectedPoint, setSelectedPoint] = useState<{ value: number; index: number } | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Modals
  const [addFundsModal, setAddFundsModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [addStockModal, setAddStockModal] = useState(false);
  const [addDividendModal, setAddDividendModal] = useState(false);
  const [dividendAmount, setDividendAmount] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");

  // Forms
  const [amount, setAmount] = useState("");
  const [stockForm, setStockForm] = useState({
    symbol: "",
    name: "",
    quantity: "",
    purchase_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
    fees: "",
  });

  // Gesture handling
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const isTouching = useSharedValue(false);
  const chartWidth = screenWidth - 64;
  const chartHeight = 200;

  const updatePointFromX = (x: number) => {
    if (!filteredHistory || filteredHistory.length < 2) return;
    
    // Calculate which point is closest to X
    const index = Math.max(0, Math.min(
      filteredHistory.length - 1,
      Math.floor((x / chartWidth) * filteredHistory.length)
    ));
    
    const values = filteredHistory.map(d => parseFloat(d.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const currentVal = values[index];
    
    // Calculate Y position (inverted since Y increases downwards)
    // Adding some padding to match LineChart internal layout
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (pId?: number) => {
    try {
      const portfoliosRes = await apiClient.get("/portfolios/");
      const portfoliosList = portfoliosRes.data || [];
      setPortfolios(portfoliosList);

      let currentId = pId || selectedPortfolioId;
      if (!currentId && portfoliosList.length > 0) {
        const def = portfoliosList.find((p: any) => p.is_default) || portfoliosList[0];
        currentId = def.id;
        setSelectedPortfolioId(currentId);
      }

      const portfolioParams = currentId ? { params: { portfolio_id: currentId } } : {};

      const [walletRes, txRes, summaryRes, portfolioRes, historyRes] = await Promise.all([
        apiClient.get("/wallet/", portfolioParams),
        apiClient.get("/transactions/", portfolioParams),
        apiClient.get("/transactions/summary/", portfolioParams),
        apiClient.get("/investments/portfolio/", portfolioParams),
        apiClient.get("/investments/portfolio_history/", portfolioParams),
      ]);

      setWallet(walletRes.data);
      setTransactions(txRes.data?.results || txRes.data || []);
      setSummary(summaryRes.data);
      setPortfolio(portfolioRes.data?.portfolio ?? null);
      setInvestments(portfolioRes.data?.investments || []);
      setPortfolioHistory(historyRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post("/portfolios/", { name: newPortfolioName });
      Alert.alert("✅ Succès", `Le Bedou "${newPortfolioName}" a été créé.`);
      setShowAddPortfolioModal(false);
      setNewPortfolioName("");
      await loadData(res.data.id);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.response?.data?.[0] || "Erreur lors de la création.";
      Alert.alert("❌ Erreur", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenamePortfolio = async () => {
    if (!editingPortfolioId || !editingName.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/portfolios/${editingPortfolioId}/`, { name: editingName });
      Alert.alert("✅ Succès", "Le Bedou a été renommé.");
      setEditingPortfolioId(null);
      setEditingName("");
      loadData();
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.response?.data?.[0] || "Erreur lors du renommage.";
      Alert.alert("❌ Erreur", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePortfolio = async (id: number) => {
    Alert.alert(
      "🗑️ Supprimer ce Bedou ?",
      "Cette action est irréversible. Toutes les données doivent être vidées avant.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiClient.delete(`/portfolios/${id}/`);
              Alert.alert("✅ Succès", "Le Bedou a été supprimé.");
              loadData();
            } catch (e: any) {
              const errorMsg = e.response?.data?.error || e.response?.data?.[0] || "Impossible de supprimer.";
              Alert.alert("❌ Erreur", errorMsg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const filteredHistory = React.useMemo(() => {
    if (!portfolioHistory || portfolioHistory.length === 0) return [];
    const now = new Date();
    let past = new Date();
    switch (historyPeriod) {
      case "1J":
        past.setDate(now.getDate() - 1);
        break;
      case "1S":
        past.setDate(now.getDate() - 7);
        break;
      case "1M":
        past.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        past.setMonth(now.getMonth() - 3);
        break;
      case "1A":
        past.setFullYear(now.getFullYear() - 1);
        break;
      default:
        past = new Date(0);
    }
    const filtered = portfolioHistory.filter((item) => new Date(item.date) >= past);
    return filtered.length > 0 ? filtered : portfolioHistory;
  }, [portfolioHistory, historyPeriod]);

  const chartColorTheme = React.useMemo(() => {
    if (filteredHistory.length < 2) return { color: "#38bdf8", rgb: "56, 189, 248" };
    const firstObj = filteredHistory[0];
    const lastObj = filteredHistory[filteredHistory.length - 1];
    
    if (lastObj.value >= firstObj.value) {
      return { color: "#22c55e", rgb: "34, 197, 94" }; 
    } else {
      return { color: "#ff5252", rgb: "255, 82, 82" }; 
    }
  }, [filteredHistory]);

  const handleAddFunds = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert("Montant invalide", "Veuillez saisir un montant correct à déposer.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/wallet/add_funds/", {
        amount: parseFloat(amount),
        portfolio_id: selectedPortfolioId,
      });
      Alert.alert(
        "✅ Succès",
        `${parseFloat(amount).toLocaleString("fr-FR")} FCFA ajoutés au Bedou !`,
      );
      setAddFundsModal(false);
      setAmount("");
      loadData();
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'ajouter des fonds");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert("Montant invalide", "Veuillez saisir un montant correct pour le retrait.");
      return;
    }
    if (parseFloat(amount) > parseFloat(wallet?.balance || 0)) {
      Alert.alert("Solde insuffisant", "Le montant demandé dépasse vos liquidités disponibles dans ce Bedou.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/wallet/withdraw/", {
        amount: parseFloat(amount),
        portfolio_id: selectedPortfolioId,
      });
      Alert.alert("✅ Succès", "Votre retrait a été effectué depuis ce Bedou.");
      setWithdrawModal(false);
      setAmount("");
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible d'effectuer le retrait");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDividend = async () => {
    if (!dividendAmount || isNaN(parseFloat(dividendAmount))) {
      Alert.alert("Montant invalide", "Veuillez saisir un montant correct pour le dividende.");
      return;
    }
    if (!selectedSymbol) {
      Alert.alert("Sélection requise", "Veuillez choisir l'entreprise qui verse le dividende.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/transactions/", {
        transaction_type: "DIVIDEND",
        amount: parseFloat(dividendAmount),
        description: `Dividende reçu de ${selectedSymbol}`
      });
      setAddDividendModal(false);
      setDividendAmount("");
      setSelectedSymbol("");
      Alert.alert("💰 Dividende reçu !", "Vos dividendes ont été crédités sur votre compte BEDOU.");
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible d'enregistrer le dividende");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStock = async () => {
    if (!stockForm.symbol || !stockForm.quantity || !stockForm.purchase_price) {
      Alert.alert("Informations manquantes", "Veuillez remplir le symbole, la quantité et le prix d'achat.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/investments/", {
        symbol: stockForm.symbol.toUpperCase(),
        name: stockForm.name || stockForm.symbol.toUpperCase(),
        investment_type: "STOCK",
        quantity: parseFloat(stockForm.quantity),
        purchase_price: parseFloat(stockForm.purchase_price),
        purchase_date: stockForm.purchase_date + "T00:00:00Z",
        fees: parseFloat(stockForm.fees || "0"),
        portfolio: selectedPortfolioId,
      });
      Alert.alert("✅ Succès", "Action ajoutée avec succès !");
      setAddStockModal(false);
      setStockForm({
        symbol: "",
        name: "",
        quantity: "",
        purchase_price: "",
        purchase_date: new Date().toISOString().split("T")[0],
        fees: "",
      });
      loadData();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.error || e.response?.data?.detail || "Impossible d'ajouter l'action";
      Alert.alert("Erreur", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amountStr: string, type: string) => {
    const val = parseFloat(amountStr || "0").toLocaleString("fr-FR");
    const sign = ["DEPOSIT", "DIVIDEND"].includes(type) ? "+" : "-";
    return `${sign}${val} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const { monthPerf, yearPerf } = React.useMemo(() => {
    if (!portfolio || !portfolioHistory || portfolioHistory.length === 0) return { monthPerf: 0, yearPerf: 0 };
    
    const currentVal = Number(portfolio.totalCurrentValue || 0);
    const currentInvested = Number(portfolio.totalInvested || 0);
    const currentROI = currentInvested > 0 ? ((currentVal - currentInvested) / currentInvested) * 100 : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const getSnapshot = (targetDate: Date) => {
      const past = portfolioHistory.filter(h => new Date(h.date) <= targetDate);
      if (past.length > 0) {
        const last = past[past.length - 1];
        return { value: Number(last.value), invested: Number(last.invested || last.value) };
      }
      const first = portfolioHistory[0];
      return { value: Number(first.value), invested: Number(first.invested || first.value) };
    };

    const snapMonth = getSnapshot(startOfMonth);
    const snapYear = getSnapshot(startOfYear);

    const calcPeriodPerf = (snap: { value: number, invested: number }) => {
      const startROI = snap.invested > 0 ? ((snap.value - snap.invested) / snap.invested) * 100 : 0;
      return currentROI - startROI;
    };
    
    return {
      monthPerf: calcPeriodPerf(snapMonth),
      yearPerf: calcPeriodPerf(snapYear)
    };
  }, [portfolio, portfolioHistory]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
          {/* Header */}
        <View style={[styles.header, { 
          backgroundColor: colors.background, 
          flexDirection: 'row', 
          justifyContent: 'center', 
          alignItems: 'center',
          position: 'relative',
          paddingHorizontal: 16
        }]}>
          <Text style={[styles.title, { color: colors.text, fontWeight: '800', textAlign: 'center' }]}>
            {portfolios.length > 1 ? "Mes Bedous" : "Mon Bedou"}
          </Text>
          <TouchableOpacity 
            style={[styles.supportBtn, { position: 'absolute', right: 16 }]} 
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

          {/* Sélecteur de Bedou */}
          <View style={{ marginTop: 10 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 15 }}
            >
              {portfolios.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedPortfolioId === p.id ? colors.primary : colors.card,
                    borderWidth: 1,
                    borderColor: selectedPortfolioId === p.id ? colors.primary : colors.border,
                    marginRight: 10,
                  }}
                  onPress={() => {
                    if (selectedPortfolioId !== p.id) {
                      setSelectedPortfolioId(p.id);
                      loadData(p.id);
                    }
                  }}
                >
                  <Text style={{ 
                    color: selectedPortfolioId === p.id ? '#fff' : colors.text,
                    fontWeight: selectedPortfolioId === p.id ? '700' : '500',
                    fontSize: 13
                  }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => setShowManageModal(true)}
              >
                <Ionicons name="settings-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Gérer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Carte Valeur du portefeuille + variation + graphe + retours */}
          {portfolio &&
            (() => {
              const current = Number(portfolio.totalCurrentValue || 0);
              const invested = Number(portfolio.totalInvested || 0);
              const totalReturn = current - invested;
              const perfPct =
                invested > 0 ? (totalReturn / invested) * 100 : 0;
              const isPositive = totalReturn >= 0;
              const color = isPositive ? "#22c55e" : "#ff5252";
              const sign = isPositive ? "+" : "-";

              return (
                <View style={styles.portfolioHeaderCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <Text style={styles.portfolioLabel}>Valeur du Bedou</Text>
                      <Text style={styles.portfolioValue}>
                        {current.toLocaleString("fr-FR")} FCFA
                      </Text>
                    </View>
                    <View style={[styles.perfBadge, { backgroundColor: isPositive ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)" }]}>
                      <Text style={[styles.perfText, { color }]}>
                        {sign}{Math.abs(perfPct).toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.portfolioChange, { color }]}>
                    {sign}{Math.abs(totalReturn).toLocaleString("fr-FR")} FCFA
                  </Text>
                  <Text style={styles.portfolioPeriod}>Depuis le début</Text>

                  {/* Interactive Point Details */}
                  {selectedPoint && filteredHistory[selectedPoint.index] && (
                    <Text style={{ color: chartColorTheme.color, fontWeight: "600", fontSize: 13, marginBottom: 8, alignSelf: "center", minHeight: 20 }}>
                      {new Date(filteredHistory[selectedPoint.index].date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })} : {Math.round(selectedPoint.value).toLocaleString("fr-FR")} FCFA
                    </Text>
                  )}
                  {/* Portfolio Graph */}
                  <View style={{ marginLeft: -16, marginBottom: 8, position: 'relative' }}>
                    <TouchableOpacity 
                      style={{ position: 'absolute', top: 10, right: 20, zIndex: 100, backgroundColor: colors.card + 'cc', padding: 10, borderRadius: 20 }}
                      onPress={() => setIsFullScreen(true)}
                    >
                      <Ionicons name="expand" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    {filteredHistory.length >= 2 ? (
                      <GestureDetector gesture={panGesture}>
                        <Animated.View style={{ position: 'relative' }}>
                          <LineChart
                            data={{
                              labels: filteredHistory.length > 5 
                                ? filteredHistory.filter((_, i) => i % Math.ceil(filteredHistory.length / 5) === 0).map(d => {
                                    const dt = new Date(d.date);
                                    return dt.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: historyPeriod === '1A' || historyPeriod === 'TOUTE' ? '2-digit' : undefined });
                                  }) 
                                : filteredHistory.map(d => {
                                    const dt = new Date(d.date);
                                    return dt.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' });
                                  }),
                              datasets: [
                                { data: filteredHistory.map(d => parseFloat(d.value)) }
                              ]
                            }}
                            width={screenWidth - 64}
                            height={200}
                            yAxisLabel=""
                            yAxisSuffix=""
                            formatYLabel={(v) => {
                              const val = parseInt(v, 10);
                              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                              return String(val);
                            }}
                            withDots={false}
                            yLabelsOffset={5}
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
                                stroke: colors.subtext,
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
                    ) : (
                      <View style={[styles.graphArea, { height: 200, justifyContent: 'center' }]}>
                        <Text style={styles.graphPlaceholderText}>Aucune donnée historique</Text>
                      </View>
                    )}
                  </View>

                  {/* Onglets période */}
                  <View style={styles.graphTabs}>
                    {["1J", "1S", "1M", "3M", "1A", "TOUTE"].map(
                      (label) => (
                        <TouchableOpacity 
                          key={label}
                          activeOpacity={0.7}
                          onPress={() => { setHistoryPeriod(label); setSelectedPoint(null); }}
                        >
                          <Text
                            style={[
                              styles.graphTab,
                              historyPeriod === label && styles.graphTabActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>

                  {/* Total retours / Total investi */}
                  <View style={styles.returnsRow}>
                    <View style={styles.returnCard}>
                      <Text style={styles.returnLabel}>Total retours</Text>
                      <Text
                        style={[
                          styles.returnAmount,
                          { color },
                        ]}
                      >
                        {sign}
                        {Math.abs(totalReturn).toLocaleString("fr-FR")} FCFA
                      </Text>
                      <Text style={styles.returnCaption}>
                        Comprend plus-values et dividendes
                      </Text>
                    </View>

                    <View style={styles.returnCard}>
                      <Text style={styles.returnLabel}>Total investi</Text>
                      <Text
                        style={[
                          styles.returnAmount,
                          { color: "#e5e7eb" },
                        ]}
                      >
                        {invested.toLocaleString("fr-FR")} FCFA
                      </Text>
                      <Text style={styles.returnCaption}>
                        De tous les types d’investissement
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()}

          {/* Solde disponible (cash) */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Liquidité (Compte Titre)</Text>
            <Text style={styles.balanceAmount}>
              {parseFloat(wallet?.balance || 0).toLocaleString("fr-FR")}
            </Text>
            <Text style={styles.currency}>FCFA</Text>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setAddFundsModal(true)}
              >
                <Text style={styles.actionIcon}>⬇️</Text>
                <Text style={styles.actionLabel}>Déposer</Text>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setWithdrawModal(true)}
              >
                <Text style={styles.actionIcon}>⬆️</Text>
                <Text style={styles.actionLabel}>Retirer</Text>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (investments.length > 0) {
                    setSelectedSymbol(investments[0].symbol);
                  }
                  setAddDividendModal(true);
                }}
              >
                <Text style={styles.actionIcon}>💰</Text>
                <Text style={styles.actionLabel}>Dividende</Text>
              </TouchableOpacity>


            </View>
          </View>



          {/* Bloc Performances */}
          {portfolio && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📈 Performances</Text>
              </View>
              <View style={styles.investCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Année en cours</Text>
                    <Text style={{ 
                      color: yearPerf >= 0 ? "#10b981" : "#ff5252", 
                      fontSize: 18, 
                      fontWeight: 'bold' 
                    }}>
                      {yearPerf > 0 ? "+" : ""}{yearPerf.toFixed(2)}%
                    </Text>
                  </View>
                  
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Mois en cours</Text>
                    <Text style={{ 
                      color: monthPerf >= 0 ? "#10b981" : "#ff5252", 
                      fontSize: 18, 
                      fontWeight: 'bold' 
                    }}>
                      {monthPerf > 0 ? "+" : ""}{monthPerf.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Répartition par Secteur */}
          {portfolio?.sector_distribution?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🥧 Répartition par secteur</Text>
              </View>
              <View style={[styles.investCard, { paddingVertical: 10 }]}>
                <PieChart
                  data={portfolio.sector_distribution.map((item: any, index: number) => ({
                    name: item.sector,
                    population: item.percentage,
                    color: SECTOR_COLORS[index % SECTOR_COLORS.length],
                    legendFontColor: colors.text,
                    legendFontSize: 12
                  }))}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => colors.text,
                  }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  center={[10, 0]}
                  absolute={false}
                  hasLegend={true}
                />
              </View>
            </View>
          )}

          {/* Mes Positions */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💼 Mes positions</Text>
            </View>

            {investments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Aucune position</Text>
                <Text style={styles.emptySubtext}>
                  Vous n'avez pas encore investi dans une action
                </Text>
              </View>
            ) : (
              investments.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/company/[symbol]",
                      params: { symbol: item.symbol, name: item.name, portfolioId: selectedPortfolioId },
                    } as any)
                  }
                >
                  <View style={styles.txLeft}>
                    <View style={[styles.companyLogoBox, { backgroundColor: '#ffffff' }]}>
                      {item.logo_url ? (
                        <Image 
                          source={{ uri: item.logo_url }} 
                          style={styles.companyLogo} 
                          resizeMode="contain" 
                        />
                      ) : (
                        <Text style={styles.txIcon}>📊</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.companyNameMain, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.companySymbol, { color: colors.subtext }]}>{item.symbol}</Text>
                    </View>
                  </View>

                  <View style={[styles.txRight, { marginLeft: 10 }]}>
                    <Text style={[styles.companyPrice, { color: colors.text }]}>
                      {parseFloat(item.quantity).toLocaleString("fr-FR")} titres
                    </Text>
                    <Text style={[styles.companyVariation, { color: colors.primary }]}>
                      {Math.round(item.current_value).toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Historique du Bedou */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📜 Historique du Bedou</Text>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Aucune opération</Text>
                <Text style={styles.emptySubtext}>
                  Les mouvements de ce Bedou s'afficheront ici
                </Text>
              </View>
            ) : (
              transactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedTransaction(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.txLeft}>
                    <View style={[styles.txIconBox, { backgroundColor: TYPE_CONFIG[tx.transaction_type]?.color + '20' }]}>
                      <Text style={styles.txIcon}>{TYPE_CONFIG[tx.transaction_type]?.icon}</Text>
                    </View>
                    <View>
                      <Text style={[styles.txLabel, { color: colors.text }]}>{TYPE_CONFIG[tx.transaction_type]?.label}</Text>
                      <Text style={[styles.txDesc, { color: colors.subtext }]} numberOfLines={1}>
                        {tx.description || tx.reference_number}
                      </Text>
                      <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                        {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: ['DEPOSIT', 'DIVIDEND'].includes(tx.transaction_type) ? '#10b981' : '#ff5252' },
                      ]}
                    >
                      {['DEPOSIT', 'DIVIDEND'].includes(tx.transaction_type) ? '+' : '-'}
                      {parseFloat(tx.amount).toLocaleString('fr-FR')} FCFA
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_CONFIG[tx.status]?.color + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: STATUS_CONFIG[tx.status]?.color }]}>
                        {STATUS_CONFIG[tx.status]?.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {/* Modal Ajouter Fonds */}
        <Modal
          visible={addFundsModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setAddFundsModal(false);
            setAmount("");
          }}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "85%" }]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>⬇️ Déposer des fonds</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setAddFundsModal(false);
                        setAmount("");
                      }}
                    >
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Montant (FCFA)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="ex: 100000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    returnKeyType="done"
                    autoFocus
                    onSubmitEditing={handleAddFunds}
                  />

                  <View style={styles.quickAmounts}>
                    {["10000", "50000", "100000", "500000"].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={styles.quickBtn}
                        onPress={() => setAmount(q)}
                      >
                        <Text style={styles.quickBtnText}>
                          {parseInt(q).toLocaleString("fr-FR")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      submitting && styles.submitBtnDisabled,
                    ]}
                    onPress={handleAddFunds}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#0f172a" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        ✅ Confirmer le dépôt
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Retrait */}
        <Modal
          visible={withdrawModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setWithdrawModal(false);
            setAmount("");
          }}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "85%" }]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>⬆️ Retirer des fonds</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setWithdrawModal(false);
                        setAmount("");
                      }}
                    >
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.balanceHint}>
                    Solde disponible:{" "}
                    {parseFloat(wallet?.balance || 0).toLocaleString("fr-FR")}{" "}
                    FCFA
                  </Text>

                  <Text style={styles.label}>Montant (FCFA)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="ex: 50000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    returnKeyType="done"
                    autoFocus
                    onSubmitEditing={handleWithdraw}
                  />

                  <View style={styles.quickAmounts}>
                    {["10000", "50000", "100000", "500000"].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={styles.quickBtn}
                        onPress={() => setAmount(q)}
                      >
                        <Text style={styles.quickBtnText}>
                          {parseInt(q).toLocaleString("fr-FR")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: "#ff5252" },
                      submitting && styles.submitBtnDisabled,
                    ]}
                    onPress={handleWithdraw}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        ✅ Confirmer le retrait
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Ajouter Action */}
        <Modal
          visible={addStockModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setAddStockModal(false);
          }}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "85%" }]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>📈 Ajouter une Action</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setAddStockModal(false);
                      }}
                    >
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Symbole (ex: SNTS, SONATEL)</Text>
                  <TextInput
                    style={styles.input}
                    value={stockForm.symbol}
                    onChangeText={(t) => setStockForm({ ...stockForm, symbol: t })}
                    placeholder="SNTS"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                  />

                  <Text style={styles.label}>Nom de l'entreprise (Optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={stockForm.name}
                    onChangeText={(t) => setStockForm({ ...stockForm, name: t })}
                    placeholder="Sonatel"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.label}>Quantité d'actions</Text>
                  <TextInput
                    style={styles.input}
                    value={stockForm.quantity}
                    onChangeText={(t) => setStockForm({ ...stockForm, quantity: t })}
                    placeholder="ex: 10"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Prix d'achat unitaire (FCFA)</Text>
                  <TextInput
                    style={styles.input}
                    value={stockForm.purchase_price}
                    onChangeText={(t) => setStockForm({ ...stockForm, purchase_price: t })}
                    placeholder="ex: 15000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Frais d'achat (FCFA) - Optionnel</Text>
                  <TextInput
                    style={styles.input}
                    value={stockForm.fees}
                    onChangeText={(t) => setStockForm({ ...stockForm, fees: t })}
                    placeholder="ex: 500"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Date d'achat (AAAA-MM-JJ)</Text>
                  <TextInput
                    style={styles.input}
                    value={stockForm.purchase_date}
                    onChangeText={(t) => setStockForm({ ...stockForm, purchase_date: t })}
                    placeholder="2024-01-01"
                    placeholderTextColor="#64748b"
                  />

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: "#a78bfa" },
                      submitting && styles.submitBtnDisabled,
                    ]}
                    onPress={handleAddStock}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        ✅ Ajouter à mon Bedou
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
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
              Historique Bedou ({historyPeriod})
            </Text>

            {(() => {
              const fsValues = filteredHistory.map(d => parseFloat(d.value));
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
                        datasets: [{ data: filteredHistory.map(d => parseFloat(d.value)) }]
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
                          stroke: colors.border,
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
              {["1J", "1S", "1M", "3M", "1A", "TOUTE"].map((label) => (
                <TouchableOpacity 
                  key={label}
                  onPress={() => setHistoryPeriod(label)}
                  style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: historyPeriod === label ? colors.primary : colors.card }}
                >
                  <Text style={{ color: historyPeriod === label ? '#fff' : colors.subtext, fontWeight: '600' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Dividende */}
        <Modal
          visible={addDividendModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setAddDividendModal(false);
            setDividendAmount("");
          }}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "85%" }]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>💰 Enregistrer un dividende</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setAddDividendModal(false);
                        setDividendAmount("");
                      }}
                    >
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Entreprise</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {investments.map((inv: any, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.quickBtn,
                          selectedSymbol === inv.symbol && { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)" }
                        ]}
                        onPress={() => setSelectedSymbol(inv.symbol)}
                      >
                        <Text style={[styles.quickBtnText, selectedSymbol === inv.symbol && { color: "#f59e0b", fontWeight: "700" }]}>
                          {inv.symbol}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.label}>Montant Net Reçu (FCFA)</Text>
                  <TextInput
                    style={styles.input}
                    value={dividendAmount}
                    onChangeText={setDividendAmount}
                    placeholder="ex: 5000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    returnKeyType="done"
                    autoFocus
                    onSubmitEditing={handleAddDividend}
                  />

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: "#f59e0b" },
                      (!dividendAmount || submitting) && styles.submitBtnDisabled
                    ]}
                    onPress={handleAddDividend}
                    disabled={!dividendAmount || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#0f172a" />
                    ) : (
                      <Text style={styles.submitBtnText}>Enregistrer le dividende</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 16 }}>
                    Les dividendes seront ajoutés à votre solde disponible.
                  </Text>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Gestion des Bedous */}
        <Modal
          visible={showManageModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowManageModal(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "85%" }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>⚙️ Gérer mes Bedous</Text>
                  <TouchableOpacity onPress={() => setShowManageModal(false)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {portfolios.map((p) => (
                    <View key={p.id} style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border
                    }}>
                      {editingPortfolioId === p.id ? (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                            value={editingName}
                            onChangeText={setEditingName}
                            autoFocus
                            placeholderTextColor="#64748b"
                          />
                          <TouchableOpacity onPress={handleRenamePortfolio}>
                            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditingPortfolioId(null)} style={{ marginLeft: 5 }}>
                            <Ionicons name="close-circle" size={28} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{p.name}</Text>
                            {p.is_default && <Text style={{ color: colors.primary, fontSize: 12 }}>Principal</Text>}
                            <Text style={{ color: '#64748b', fontSize: 12 }}>{parseFloat(p.balance || 0).toLocaleString('fr-FR')} FCFA</Text>
                          </View>
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity 
                              onPress={() => {
                                setEditingPortfolioId(p.id);
                                setEditingName(p.name);
                              }}
                              style={{ padding: 8 }}
                            >
                              <Ionicons name="pencil" size={20} color={colors.primary} />
                            </TouchableOpacity>
                            {!p.is_default && (
                              <TouchableOpacity 
                                onPress={() => handleDeletePortfolio(p.id)}
                                style={{ padding: 8 }}
                              >
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: colors.primary, marginTop: 20 }
                    ]}
                    onPress={() => {
                      setShowManageModal(false);
                      setShowAddPortfolioModal(true);
                    }}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>Ajouter un Bedou</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Nouveau Bedou */}
        <Modal
          visible={showAddPortfolioModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAddPortfolioModal(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "85%" }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>✨ Créer un nouveau Bedou</Text>
                  <TouchableOpacity onPress={() => setShowAddPortfolioModal(false)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Nom du Bedou (ex: SGI Atlantique)</Text>
                <TextInput
                  style={styles.input}
                  value={newPortfolioName}
                  onChangeText={setNewPortfolioName}
                  placeholder="Entrez le nom du compte"
                  placeholderTextColor="#64748b"
                  autoFocus
                  onSubmitEditing={handleAddPortfolio}
                />

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: colors.primary },
                    (!newPortfolioName.trim() || submitting) && styles.submitBtnDisabled
                  ]}
                  onPress={handleAddPortfolio}
                  disabled={!newPortfolioName.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Créer mon Bedou</Text>
                  )}
                </TouchableOpacity>

                <Text style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 16 }}>
                  Séparez vos comptes SGI pour mieux suivre vos performances.
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Détail Transaction */}
        <Modal
          visible={!!selectedTransaction}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedTransaction(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: 40 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📄 Détail de l'opération</Text>
                <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedTransaction && (
                <View>
                  <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <View style={{ 
                      width: 60, height: 60, borderRadius: 30, 
                      backgroundColor: TYPE_CONFIG[selectedTransaction.transaction_type]?.color + '20',
                      justifyContent: 'center', alignItems: 'center', marginBottom: 12
                    }}>
                      <Text style={{ fontSize: 30 }}>{TYPE_CONFIG[selectedTransaction.transaction_type]?.icon}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
                      {parseFloat(selectedTransaction.amount).toLocaleString('fr-FR')} FCFA
                    </Text>
                    <Text style={{ color: colors.subtext, fontSize: 14, marginTop: 4 }}>
                      {TYPE_CONFIG[selectedTransaction.transaction_type]?.label}
                    </Text>
                  </View>

                  <View style={styles.detailList}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Statut</Text>
                      <View style={{ 
                        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, 
                        backgroundColor: STATUS_CONFIG[selectedTransaction.status]?.color + '20' 
                      }}>
                        <Text style={{ color: STATUS_CONFIG[selectedTransaction.status]?.color, fontWeight: '700', fontSize: 12 }}>
                          {STATUS_CONFIG[selectedTransaction.status]?.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Compte Bedou</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.portfolio_name || 'Principal'}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{new Date(selectedTransaction.created_at).toLocaleString('fr-FR')}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Référence</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.reference_number}</Text>
                    </View>

                    {selectedTransaction.description && (
                      <View style={[styles.detailItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={[styles.detailValue, { marginTop: 4, color: colors.subtext }]}>
                          {selectedTransaction.description}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 30 }]}
                    onPress={() => setSelectedTransaction(null)}
                  >
                    <Text style={styles.submitBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: { color: "#f1f5f9", fontSize: 22, fontWeight: "700" },

  // Bloc haut : valeur du portefeuille + graph + retours
  portfolioHeaderCard: {
    backgroundColor: "#0b1120",
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  portfolioLabel: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 4,
  },
  portfolioValue: {
    color: "#f9fafb",
    fontSize: 28,
    fontWeight: "700",
  },
  portfolioChange: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  portfolioPeriod: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },
  graphArea: {
    marginTop: 16,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
  },
  graphPlaceholderText: {
    color: "#64748b",
    fontSize: 12,
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
  graphTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  graphTab: {
    color: "#64748b",
    fontSize: 11,
  },
  graphTabActive: {
    color: "#f9fafb",
    fontWeight: "600",
  },
  returnsRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  returnCard: {
    flex: 1,
    backgroundColor: "#020617",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  returnLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 4,
  },
  returnAmount: {
    color: "#f9fafb",
    fontSize: 15,
    fontWeight: "700",
  },
  returnCaption: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4,
  },

  // Solde disponible (cash)
  balanceCard: {
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
    alignItems: "center",
  },
  balanceLabel: { color: "#94a3b8", fontSize: 13, marginBottom: 4, textAlign: "center" },
  balanceAmount: { color: "#e5e7eb", fontSize: 28, fontWeight: "700", textAlign: "center" },
  currency: { color: "#64748b", fontSize: 12, marginTop: 2, textAlign: "center" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  actionBtn: { flex: 1, alignItems: "center" },
  actionIcon: { fontSize: 18, marginBottom: 4 },
  actionLabel: { color: "#cbd5e1", fontSize: 12, fontWeight: "600" },
  actionDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#334155",
  },

  // Stats rapides & investissement
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statIcon: { fontSize: 18, marginBottom: 6 },
  statLabel: { color: "#94a3b8", fontSize: 11, marginBottom: 4 },
  statValue: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },

  investCard: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  investLabel: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },
  investValue: { color: "#f1f5f9", fontSize: 18, fontWeight: "700" },
  investSub: { color: "#64748b", fontSize: 12, marginTop: 4 },
  perfBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#020617",
  },
  perfText: { fontSize: 14, fontWeight: "700" },

  section: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { color: "#e5e7eb", fontSize: 16, fontWeight: "700" },
  addBtnText: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "600",
  },

  // Historique
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: "#cbd5e1", fontSize: 15, fontWeight: "600" },
  emptySubtext: { color: "#64748b", fontSize: 13, marginTop: 4 },

  txCard: {
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
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  companyLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  companyLogo: {
    width: 32,
    height: 32,
  },
  txIcon: { fontSize: 20 },
  companyNameMain: { color: "#f1f5f9", fontSize: 15, fontWeight: "600" },
  companySymbol: { color: "#94a3b8", fontSize: 13, marginTop: 2, fontWeight: "500" },

  txRight: { alignItems: "flex-end" },
  companyPrice: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  companyVariation: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: "600" },

  // Modals
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: "700" },
  detailList: { marginTop: 10 },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  detailLabel: { color: "#94a3b8", fontSize: 14 },
  detailValue: { color: "#f1f5f9", fontSize: 14, fontWeight: "600" },
  closeBtn: { color: "#94a3b8", fontSize: 20 },
  label: { color: "#94a3b8", fontSize: 12, marginBottom: 6, marginTop: 16 },
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
  balanceHint: {
    color: "#cbd5e1",
    fontSize: 12,
    marginBottom: 8,
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
  quickBtnText: { color: "#e5e7eb", fontSize: 12 },

  submitBtn: {
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  supportBtn: {
    padding: 8,
    borderRadius: 12,
  },
});
