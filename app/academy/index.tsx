import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import apiClient from '../../src/api/client';

const { width } = Dimensions.get('window');

const BADGES = [
  { id: 1, label: 'Pionnier', icon: '🎖️', unlocked: true },
  { id: 2, label: 'Épargnant', icon: '🐖', unlocked: true },
  { id: 3, label: 'Analyste', icon: '📊', unlocked: false },
  { id: 4, label: 'Millionnaire', icon: '💎', unlocked: false },
];

export default function AcademyScreen() {
  const { colors } = useTheme();
  const { profile } = useLocalSearchParams();
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesRes, statsRes, userRes] = await Promise.all([
        apiClient.get('academy/courses/'),
        apiClient.get('academy/stats/'),
        apiClient.get('users/me/')
      ]);
      setCourses(coursesRes.data || []);
      setStats(statsRes.data);
      setUser(userRes.data);
    } catch (e) {
      console.error("loadData error", e);
    } finally {
      setLoading(false);
    }
  };

  const profileLabels: any = {
    prudent: { label: 'Prudent 🛡️', color: '#10b981' },
    equilibre: { label: 'Équilibré ⚖️', color: '#38bdf8' },
    dynamique: { label: 'Dynamique 🚀', color: '#a78bfa' }
  };

  const currentProfile = profileLabels[profile as string] || profileLabels.prudent;

  const [purchaseModal, setPurchaseModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const isMember = user?.is_club_member;

  const handleCoursePress = (course: any) => {
    if (course.is_free || course.is_purchased || isMember) {
      router.push(`/academy/course/${course.id}` as any);
    } else {
      setSelectedCourse(course);
      setPurchaseModal(true);
    }
  };

  const handleConfirmPurchase = () => {
    setPurchaseModal(false);
    setTimeout(() => {
      setPaymentModal(true);
    }, 300); // Petit délai pour fluidifier la transition
  };

  const handlePayment = async (methodId: string) => {
    setProcessingPayment(true);
    try {
      // Appel API pour valider l'achat
      await apiClient.post(`academy/courses/${selectedCourse.id}/purchase/`, { method: methodId });
      
      // Rafraîchir les données
      await loadData();
      
      setPaymentModal(false);
      
      // Ouvrir le cours immédiatement après l'achat
      setTimeout(() => {
        router.push(`/academy/course/${selectedCourse.id}` as any);
      }, 500);

    } catch (e) {
      console.error("Payment error", e);
      Alert.alert("Erreur", "Le paiement a échoué. Veuillez réessayer.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const PAYMENT_METHODS = [
    { id: 'wave', name: 'Wave', icon: '🌊', color: '#10b981' },
    { id: 'om', name: 'Orange Money', icon: '🟧', color: '#f97316' },
    { id: 'djamo', name: 'Djamo', icon: '💳', color: '#3b82f6' },
    { id: 'cb', name: 'Carte Bleue', icon: '🏦', color: '#64748b' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', color: '#0ea5e9' }
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const userLevel = stats?.level || 1;
  const userXp = stats?.xp || 0;
  const nextLevelXp = stats?.next_level_xp || 1000;
  const progressPercent = stats?.progress_percent || 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Premium */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={[styles.profileBadge, { backgroundColor: currentProfile.color + '20' }]}>
              <Text style={[styles.profileText, { color: currentProfile.color }]}>
                {currentProfile.label}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>Ma Progression</Text>
          
          {/* Barre de progression globale */}
          <View style={styles.globalProgressContainer}>
            <View style={styles.progressInfo}>
              <Text style={{ color: colors.subtext, fontSize: 13 }}>Niveau {userLevel}</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{userXp} / {nextLevelXp} XP</Text>
            </View>
            <View style={styles.globalProgressBarBg}>
              <View style={[styles.globalProgressBarFill, { backgroundColor: colors.primary, width: `${progressPercent}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Section Badges */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes Trophées</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesRow}>
            {BADGES.map(badge => (
              <View key={badge.id} style={[styles.badgeItem, { opacity: badge.unlocked ? 1 : 0.4 }]}>
                <View style={[styles.badgeCircle, { backgroundColor: colors.card, borderColor: badge.unlocked ? colors.primary : colors.border }]}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                </View>
                <Text style={[styles.badgeLabel, { color: colors.text }]}>{badge.label}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 30 }]}>Formations</Text>
          
          {courses.map((course, index) => (
            <Animated.View 
              key={course.id} 
              entering={FadeInDown.delay(index * 100).duration(500)}
            >
              <TouchableOpacity 
                style={[
                  styles.courseCard, 
                  { backgroundColor: colors.card, borderColor: colors.border },
                  (!course.is_free && !course.is_purchased) && { opacity: 0.85 }
                ]}
                onPress={() => handleCoursePress(course)}
              >
                <Image 
                  source={{ uri: course.image_url || 'https://images.unsplash.com/photo-1611974714851-13550246b82a?w=800' }} 
                  style={styles.courseImage} 
                />
                
                {course.progress === 100 && (
                  <View style={styles.completedOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    <Text style={styles.completedText}>Terminé</Text>
                  </View>
                )}

                {(!course.is_free && !course.is_purchased && !isMember) && (
                  <View style={styles.lockedOverlay}>
                    <Ionicons name="lock-closed" size={24} color="white" />
                    <Text style={styles.lockedPrice}>{parseFloat(course.price).toLocaleString()} FCFA</Text>
                  </View>
                )}

                {(!course.is_free && !course.is_purchased && isMember) && (
                  <View style={[styles.lockedOverlay, { backgroundColor: 'rgba(16, 185, 129, 0.4)' }]}>
                    <Ionicons name="sparkles" size={24} color="white" />
                    <Text style={[styles.lockedPrice, { fontSize: 14 }]}>Accès Club Actif</Text>
                  </View>
                )}

                <View style={styles.courseInfo}>
                  <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
                  
                  {isMember && !course.is_free && !course.is_purchased ? (
                    <View style={[styles.paidInfoRow, { backgroundColor: '#10b98120' }]}>
                      <Ionicons name="star" size={14} color="#10b981" />
                      <Text style={[styles.paidText, { color: '#10b981' }]}>Inclus dans le Club</Text>
                    </View>
                  ) : (
                    (course.is_free || course.is_purchased) ? (
                      <View style={styles.courseProgressRow}>
                        <View style={styles.courseProgressBarBg}>
                          <View style={[styles.courseProgressBarFill, { backgroundColor: colors.primary, width: `${course.progress || 0}%` }]} />
                        </View>
                        <Text style={[styles.courseProgressPercent, { color: colors.subtext }]}>{course.progress || 0}%</Text>
                      </View>
                    ) : (
                      <View style={styles.paidInfoRow}>
                        <Ionicons name="cart-outline" size={16} color={colors.subtext} />
                        <Text style={[styles.paidText, { color: colors.subtext }]}>Contenu Premium</Text>
                      </View>
                    )
                  )}

                  <View style={styles.courseMeta}>
                    <Text style={[styles.courseLevel, { color: colors.subtext }]}>{course.level}</Text>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: (course.is_free || course.is_purchased) ? colors.primary : '#334155' }]}
                      onPress={() => handleCoursePress(course)}
                    >
                      <Text style={styles.actionBtnText}>
                        {(course.is_free || course.is_purchased || isMember) ? ((course.progress || 0) > 0 ? 'Continuer' : 'Commencer') : 'Débloquer'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Modal Avertissement d'Achat */}
      {purchaseModal && selectedCourse && (
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconBox}>
              <Ionicons name="cart" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Débloquer le cours</Text>
            <Text style={[styles.modalDesc, { color: colors.subtext }]}>
              Vous êtes sur le point de procéder à l'achat du cours :
            </Text>
            <Text style={[styles.modalCourseName, { color: colors.text }]}>"{selectedCourse.title}"</Text>
            <Text style={[styles.modalPrice, { color: colors.primary }]}>{parseFloat(selectedCourse.price).toLocaleString()} FCFA</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setPurchaseModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
                onPress={handleConfirmPurchase}
              >
                <Text style={styles.modalBtnText}>Valider l'achat</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Modal Méthodes de Paiement */}
      {paymentModal && selectedCourse && (
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.modalPaymentBox, { backgroundColor: colors.card }]}>
            <View style={styles.paymentHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Moyen de paiement</Text>
              <TouchableOpacity onPress={() => setPaymentModal(false)} disabled={processingPayment}>
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.paymentSubtitle, { color: colors.subtext }]}>
              Choisissez comment payer les {parseFloat(selectedCourse.price).toLocaleString()} FCFA
            </Text>

            <ScrollView style={styles.paymentList}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity 
                  key={method.id} 
                  style={[styles.paymentMethod, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => handlePayment(method.id)}
                  disabled={processingPayment}
                >
                  <View style={[styles.paymentIconBox, { backgroundColor: method.color + '20' }]}>
                    <Text style={styles.paymentIcon}>{method.icon}</Text>
                  </View>
                  <Text style={[styles.paymentName, { color: colors.text }]}>{method.name}</Text>
                  {processingPayment ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  profileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  profileText: { fontSize: 13, fontWeight: '700' },
  globalProgressContainer: { marginTop: 10 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  globalProgressBarBg: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  globalProgressBarFill: { height: '100%', borderRadius: 4 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  badgesRow: { flexDirection: 'row' },
  badgeItem: { alignItems: 'center', marginRight: 20 },
  badgeCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  badgeIcon: { fontSize: 24 },
  badgeLabel: { fontSize: 11, fontWeight: '600' },
  courseCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  courseImage: { width: '100%', height: 160 },
  completedOverlay: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  completedText: { color: '#10b981', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  lockedPrice: { color: 'white', fontSize: 18, fontWeight: '800', marginTop: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  courseInfo: { padding: 20 },
  courseTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  courseProgressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  courseProgressBarBg: { flex: 1, height: 4, backgroundColor: '#334155', borderRadius: 2, marginRight: 10 },
  courseProgressBarFill: { height: '100%', borderRadius: 2 },
  courseProgressPercent: { fontSize: 12, fontWeight: '600' },
  paidInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#33415540', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paidText: { fontSize: 11, fontWeight: '600', marginLeft: 6 },
  courseMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseLevel: { fontSize: 12, fontWeight: '600' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  actionBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIconBox: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56,189,248,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalCourseName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalBtnCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  modalBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
  modalPaymentBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  paymentList: {
    width: '100%',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  paymentIconBox: {
    width: 40, height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentIcon: {
    fontSize: 20,
  },
  paymentName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
