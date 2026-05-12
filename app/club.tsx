import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '../src/api/client';
import { useTheme } from '../src/context/ThemeContext';
import Animated, { FadeInDown, FadeInUp, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import YoutubePlayer from "react-native-youtube-iframe";

const { width } = Dimensions.get('window');

const getYouTubeVideoId = (url: string) => {
  if (!url) return null;
  const cleanUrl = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = cleanUrl.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Données fictives du Coach

export default function ClubScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const VideoPlayerModal = () => (
    <Modal visible={!!selectedVideo} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
          onPress={() => setSelectedVideo(null)}
        >
          <Ionicons name="close-circle" size={40} color="#fff" />
        </TouchableOpacity>
        
        {selectedVideo && getYouTubeVideoId(selectedVideo) ? (
          <View style={{ width: '100%', height: 250 }}>
            <YoutubePlayer
              key={getYouTubeVideoId(selectedVideo)}
              height={250}
              play={true}
              videoId={getYouTubeVideoId(selectedVideo) || ''}
              webViewProps={{
                androidLayerType: 'hardware',
                allowsFullscreenVideo: true,
              }}
            />
          </View>
        ) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="warning-outline" size={48} color="#ef4444" />
            <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 15, fontSize: 16 }}>
              Lien vidéo non reconnu
            </Text>
            <Text style={{ color: '#fff', fontSize: 12, marginTop: 10, opacity: 0.6 }}>URL: {selectedVideo}</Text>
          </View>
        )}
      </View>
    </Modal>
  );

  useEffect(() => {
    loadClubData();
  }, []);

  const loadClubData = async () => {
    try {
      const [profileRes, coachesRes] = await Promise.all([
        apiClient.get('users/me/'),
        apiClient.get('coaches/')
      ]);
      setUser(profileRes.data);
      setHasAccess(profileRes.data.is_club_member);
      setCoaches(coachesRes.data || []);
      
      // Détecter si l'utilisateur est l'un des coachs
      const coachProfile = coachesRes.data?.find((c: any) => c.user === profileRes.data.id);
      if (coachProfile) {
        setIsCoach(true);
      }
    } catch (e) {
      console.error("Erreur Club Data", e);
      setHasAccess(false);
    }
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX(20) // Déclenche après 20px de mouvement horizontal
    .onEnd((event) => {
      if (event.translationX > 100 && Math.abs(event.translationY) < 50) {
        runOnJS(setSelectedCoach)(null);
      }
    });

  const handleJoinClub = async () => {
    setLoading(true);
    try {
      // Simulation d'un paiement et mise à jour backend
      await apiClient.patch('users/me/', { is_club_member: true });
      setHasAccess(true);
      Alert.alert("Bienvenue au Club !", "Votre accès a été activé. Vous avez désormais accès aux analyses du coach et à l'Academy gratuitement.");
    } catch (e) {
      Alert.alert("Erreur", "Impossible de valider votre inscription pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = () => {
    setLoading(true);
    // Simulation d'action
    setTimeout(() => {
      setIsFollowing(!isFollowing);
      setLoading(false);
      Alert.alert(
        isFollowing ? "Désabonné" : "Félicitations !",
        isFollowing
          ? "Vous ne suivez plus les positions du Coach."
          : "Vous suivez maintenant le Bedou du Coach. Vous recevrez une notification à chaque mouvement."
      );
    }, 800);
  };

  const handleCopyTrade = (symbol: string) => {
    Alert.alert(
      "Copier l'investissement",
      `Souhaitez-vous acheter ${symbol} pour aligner votre Bedou ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Acheter", onPress: () => router.push({ pathname: '/investments', params: { search: symbol } } as any) }
      ]
    );
  };

  const handleSubmitPost = async (postData: any) => {
    try {
      setLoading(true);
      await apiClient.post('coaches/post-analysis/', postData);
      Alert.alert("Succès", "Votre analyse a été publiée avec succès.");
      setShowPostModal(false);
      loadClubData(); // Recharger les données
    } catch (e) {
      Alert.alert("Erreur", "Impossible de publier l'analyse.");
    } finally {
      setLoading(false);
    }
  };

  const PostAnalysisModal = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Animated.View entering={FadeInUp} style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle Analyse Vidéo</Text>
            <TouchableOpacity onPress={() => setShowPostModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ padding: 20 }}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Titre de l'analyse</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: Analyse de la semaine..."
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Lien de la vidéo (MP4, YouTube, etc.)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="https://..."
              placeholderTextColor="#94a3b8"
              value={videoUrl}
              onChangeText={setVideoUrl}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description / Analyse textuelle</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="Détaillez votre analyse ici..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              value={content}
              onChangeText={setContent}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleSubmitPost({ title, content, video_url: videoUrl })}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Publier l'analyse</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  const Disclaimer = () => (
    <View style={[styles.disclaimerBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
      <Ionicons name="information-circle-outline" size={18} color={colors.subtext} style={{ marginRight: 8 }} />
      <Text style={[styles.disclaimerText, { color: colors.subtext }]}>
        <Text style={{ fontWeight: '700' }}>Note importante :</Text> Tous les conseils ne sont en aucun cas une obligation d'achat. Vous prenez vos décisions après vos propres analyses.
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {hasAccess === null ? (
        <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !hasAccess ? (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.landingContent} showsVerticalScrollIndicator={false}>
            <Disclaimer />
            <Animated.View entering={FadeInUp.delay(200)} style={styles.landingHeader}>
              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 40 }}>🤝</Text>
              </View>
              <Text style={[styles.landingTitle, { color: colors.text }]}>Le Club Bedou Magique</Text>
              <Text style={[styles.landingSubtitle, { color: colors.subtext }]}>
                L'élite de l'investissement BRVM à votre portée.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400)} style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}><Ionicons name="analytics" size={24} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Analyses des Coachs</Text>
                  <Text style={styles.benefitDesc}>Accédez aux explications détaillées et aux analyses stratégiques des coachs.</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}><Ionicons name="copy" size={24} color="#10b981" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Copie de Bedou</Text>
                  <Text style={styles.benefitDesc}>Suivez en temps réel les positions des coachs et copiez ses mouvements en un clic.</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}><Ionicons name="school" size={24} color="#f59e0b" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Academy Incluse</Text>
                  <Text style={styles.benefitDesc}>Tous les cours et formations de l'Academy deviennent 100% gratuits pour les membres du club.</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600)} style={[styles.pricingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.pricingLabel, { color: colors.subtext }]}>TARIF PREMIUM</Text>
              <Text style={[styles.pricingValue, { color: colors.text }]}>50.000 FCFA</Text>
              <Text style={[styles.pricingSub, { color: colors.subtext }]}>à l'inscription</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.pricingValue, { color: colors.text, fontSize: 24 }]}>10.000 FCFA / mois</Text>
              <Text style={[styles.pricingSub, { color: colors.subtext }]}>sans engagement</Text>
            </Animated.View>

            <View style={styles.landingActions}>
              <TouchableOpacity 
                style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                onPress={handleJoinClub}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>J'accède au Club</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.notNowBtn}
                onPress={() => router.back()}
              >
                <Text style={[styles.notNowText, { color: colors.subtext }]}>Pas maintenant</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : !selectedCoach ? (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Espace Le Club</Text>
          {isCoach ? (
            <TouchableOpacity onPress={() => setShowPostModal(true)} style={styles.postActionBtn}>
              <Ionicons name="add-circle" size={32} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 34 }} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Disclaimer />
          <Animated.View entering={FadeInUp.delay(200)} style={styles.welcomeBox}>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>Bienvenue, {user?.first_name} ! ✨</Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.subtext }]}>
              Sélectionnez l'expert que vous souhaitez suivre pour accéder à ses stratégies exclusives.
            </Text>
          </Animated.View>

          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 15 }]}>Nos Coachs Experts</Text>

          {coaches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.subtext} />
              <Text style={{ color: colors.subtext, marginTop: 10, textAlign: 'center' }}>
                Les coachs sont en cours de préparation. Revenez très bientôt !
              </Text>
            </View>
          ) : (
            coaches.map((coach, index) => (
              <Animated.View key={coach.id} entering={FadeInDown.delay(300 + index * 100)}>
                <TouchableOpacity
                  style={[styles.coachSelectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedCoach(coach)}
                >
                  <View style={styles.coachCardHeader}>
                    <View style={styles.avatarContainerSmall}>
                      {coach.avatar_url ? (
                        <Image source={{ uri: coach.avatar_url }} style={styles.avatarImageSmall} />
                      ) : (
                        <Text style={styles.avatarPlaceholderSmall}>
                          {coach.name.split(' ').map((n: string) => n[0]).join('')}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.coachSelectionName, { color: colors.text }]}>{coach.name}</Text>
                      <Text style={[styles.coachSelectionTitle, { color: colors.subtext }]} numberOfLines={1}>
                        {coach.title}
                      </Text>
                    </View>
                    <View style={styles.perfBadge}>
                      <Text style={styles.perfValue}>{coach.performance_year}</Text>
                    </View>
                  </View>

                  <Text style={[styles.coachSelectionBio, { color: colors.subtext }]} numberOfLines={2}>
                    {coach.bio}
                  </Text>

                  <View style={styles.coachFooter}>
                    <View style={styles.followerInfo}>
                      <Ionicons name="people-outline" size={14} color={colors.subtext} />
                      <Text style={styles.followerText}>{coach.followers_count} membres</Text>
                    </View>
                    <Text style={styles.viewBtnText}>Voir les conseils <Ionicons name="arrow-forward" size={12} /></Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
      ) : (
        <GestureDetector gesture={swipeGesture}>
          <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCoach(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{selectedCoach.name}</Text>
          <TouchableOpacity style={styles.infoBtn}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Disclaimer />
        {/* Profil du Coach */}
        <Animated.View entering={FadeInUp.delay(200)} style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.coachHeader}>
                <View style={styles.avatarContainer}>
                  {selectedCoach.avatar_url ? (
                    <Image source={{ uri: selectedCoach.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarPlaceholder}>
                      {selectedCoach.name.split(' ').map((n: any) => n[0]).join('')}
                    </Text>
                  )}
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#38bdf8" />
                  </View>
                </View>
                <View style={styles.coachInfo}>
                  <Text style={[styles.coachName, { color: colors.text }]}>{selectedCoach.name}</Text>
                  <Text style={[styles.coachTitle, { color: colors.subtext }]}>{selectedCoach.title}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{selectedCoach.performance_year}</Text>
                      <Text style={styles.statLabel}>Perf. An</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{selectedCoach.followers_count}</Text>
                      <Text style={styles.statLabel}>Membres</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={[styles.coachBio, { color: colors.subtext }]}>{selectedCoach.bio}</Text>

              <TouchableOpacity
                style={[
                  styles.followBtn,
                  { backgroundColor: isFollowing ? colors.border : colors.primary }
                ]}
                onPress={handleFollow}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name={isFollowing ? "checkmark-done" : "person-add"} size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.followBtnText}>
                      {isFollowing ? "Vous suivez ce coach" : "Suivre le Bedou"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Derniers Conseils */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Conseils d'expert</Text>
              <TouchableOpacity>
                <Text style={{ color: colors.primary, fontSize: 13 }}>Tout voir</Text>
              </TouchableOpacity>
            </View>

            {selectedCoach.tips && selectedCoach.tips.length > 0 ? (
              selectedCoach.tips.map((tip: any, index: number) => (
                <Animated.View
                  key={tip.id || index}
                  entering={FadeInDown.delay(300 + index * 100)}
                  style={[styles.tipCard, { backgroundColor: colors.card, borderLeftColor: tip.tip_type === 'ACHETER' ? '#22c55e' : tip.tip_type === 'VENDRE' ? '#ff5252' : '#f59e0b' }]}
                >
                  <View style={styles.tipTop}>
                    <View style={[styles.typeBadge, { backgroundColor: tip.tip_type === 'ACHETER' ? '#22c55e20' : tip.tip_type === 'VENDRE' ? '#ff525220' : '#f59e0b20' }]}>
                      <Text style={[styles.typeText, { color: tip.tip_type === 'ACHETER' ? '#22c55e' : tip.tip_type === 'VENDRE' ? '#ff5252' : '#f59e0b' }]}>
                        {tip.tip_type} {tip.symbol}
                      </Text>
                    </View>
                    <Text style={styles.tipDate}>{tip.date}</Text>
                  </View>
                  <Text style={[styles.tipReason, { color: colors.text }]}>{tip.reason}</Text>
                  {tip.tip_type === 'ACHETER' && (
                    <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopyTrade(tip.symbol)}>
                      <Text style={styles.copyBtnText}>Copier l'ordre</Text>
                      <Ionicons name="chevron-forward" size={14} color="#38bdf8" />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              ))
            ) : (
              <Text style={{ color: colors.subtext, fontStyle: 'italic', marginBottom: 20 }}>Aucun conseil récent.</Text>
            )}

            {/* Analyses Vidéo */}
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Analyses Vidéo</Text>
              <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingBottom: 10, paddingRight: 20 }}>
              {selectedCoach.posts && selectedCoach.posts.length > 0 ? (
                selectedCoach.posts.map((post: any, index: number) => (
                  <Animated.View key={post.id || index} entering={FadeInDown.delay(400 + index * 100)}>
                    <TouchableOpacity 
                      style={[styles.videoPostCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setSelectedVideo(post.video_url)}
                    >
                      <View style={styles.thumbnailContainer}>
                          {post.thumbnail_url ? (
                              <Image source={{ uri: post.thumbnail_url }} style={styles.thumbnail} />
                          ) : (
                              <View style={[styles.thumbnailPlaceholder, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                                  <Ionicons name="videocam" size={32} color={colors.subtext} />
                              </View>
                          )}
                          <View style={styles.playOverlay}>
                              <Ionicons name="play" size={24} color="#fff" />
                          </View>
                      </View>
                      <View style={styles.postInfo}>
                          <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={2}>{post.title}</Text>
                          <Text style={styles.postDate}>
                            {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))
              ) : (
                <View style={{ paddingVertical: 20 }}>
                  <Text style={{ color: colors.subtext, fontStyle: 'italic' }}>Aucune analyse vidéo disponible.</Text>
                </View>
              )}
            </ScrollView>

            {/* Portefeuille du Coach */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Positions du Coach</Text>
              <Ionicons name="eye-outline" size={18} color={colors.subtext} />
            </View>

            <View style={[styles.portfolioBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {selectedCoach.holdings && selectedCoach.holdings.length > 0 ? (
                selectedCoach.holdings.map((item: any, index: number) => (
                  <View key={item.id || item.symbol} style={[styles.portfolioItem, index !== selectedCoach.holdings.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                    <View style={styles.portLeft}>
                      <View style={styles.symbolCircle}>
                        <Text style={styles.symbolLetter}>{item.symbol[0]}</Text>
                      </View>
                      <View>
                        <Text style={[styles.portSymbol, { color: colors.text }]}>{item.symbol}</Text>
                        <Text style={styles.portName}>{item.name}</Text>
                      </View>
                    </View>
                    <View style={styles.portRight}>
                      <Text style={[styles.portValue, { color: colors.text }]}>{parseFloat(item.avg_price).toLocaleString()} FCFA</Text>
                      <Text style={[styles.portPerf, { color: item.variation.startsWith('+') ? '#22c55e' : '#ff5252' }]}>
                        {item.variation}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.subtext }}>Le Bedou est privé pour le moment.</Text>
                </View>
              )}
            </View>

        <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </GestureDetector>
      )}
      
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}
      >
        <PostAnalysisModal />
      </Modal>

      <VideoPlayerModal />

    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postActionBtn: {
    padding: 5,
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 'auto',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 20 }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
  },
  textArea: {
    height: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backBtn: {
    padding: 5,
  },
  infoBtn: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  disclaimerBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  landingContent: {
    padding: 24,
    alignItems: 'center',
  },
  landingHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#38bdf820',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  landingTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  landingSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#38bdf805',
    padding: 16,
    borderRadius: 20,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 }
    })
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  pricingCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 32,
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  pricingValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  pricingSub: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 20,
  },
  landingActions: {
    width: '100%',
    gap: 12,
  },
  joinBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  notNowBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  notNowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  welcomeBox: {
    marginBottom: 30,
    marginTop: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  coachSelectionCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainerSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImageSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholderSmall: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  coachSelectionName: {
    fontSize: 16,
    fontWeight: '800',
  },
  coachSelectionTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  perfBadge: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  perfValue: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  coachSelectionBio: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 15,
  },
  coachFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  followerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followerText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '500',
  },
  viewBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    marginTop: 20,
  },
  coachCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarPlaceholder: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  coachTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 15,
  },
  coachBio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  followBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  tipCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tipDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  tipReason: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  portfolioBox: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  portLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  symbolLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
  },
  portSymbol: {
    fontSize: 15,
    fontWeight: '700',
  },
  portName: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  portRight: {
    alignItems: 'flex-end',
  },
  portValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  portPerf: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  videoPostCard: {
    width: 220,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 }
    })
  },
  thumbnailContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postInfo: {
    padding: 12,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  postDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  }
});
