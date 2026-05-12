import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../src/api/client';
import { useAuth } from '../_layout';
import { useTheme } from '../../src/context/ThemeContext';

export default function ProfileScreen() {
  const { logoutAuth } = useAuth();
  const { theme, toggleTheme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coachProfile, setCoachProfile] = useState<any>(null);
  
  // KYC
  const [kycModal, setKycModal] = useState(false);
  const [kycUploading, setKycUploading] = useState(false);

  // Edit form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/users/');
      setUser(res.data);
      setFirstName(res.data.first_name || '');
      setLastName(res.data.last_name || '');
      setPhone(res.data.phone || '');
      setCity(res.data.city || '');
      setCountry(res.data.country || '');
    } catch (e) {
      console.error(e);
    }

    try {
      const coachRes = await apiClient.get('/coaches/me/');
      setCoachProfile(coachRes.data);
    } catch (e) {
      // Pas un coach, on ignore
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.patch('/users/me/', {
        first_name: firstName,
        last_name: lastName,
        phone,
        city,
        country,
      });
      setUser(res.data);
      setEditModal(false);
      Alert.alert('✅ Succès', 'Profil mis à jour !');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async (docType: string) => {
    let pickerResult;

    if (docType === 'SELFIE') {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.granted === false) {
        Alert.alert('Erreur', 'Permission refusée pour accéder à la caméra');
        return;
      }
      pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Erreur', 'Permission refusée pour accéder aux photos');
        return;
      }
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
    }

    if (pickerResult.canceled) return;

    const file = pickerResult.assets[0];
    const formData = new FormData() as any;
    formData.append('document_type', docType);
    formData.append('file', {
      uri: file.uri,
      name: 'document.jpg',
      type: 'image/jpeg',
    });

    setKycUploading(true);
    try {
      await apiClient.post('/kyc-documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('✅ Succès', 'Document envoyé avec succès');
      await loadProfile();
    } catch (e: any) {
      Alert.alert('Erreur', 'Échec de l\'envoi du document');
    } finally {
      setKycUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '🚪 Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logoutAuth();
          },
        },
      ]
    );
  };

  const handleFeatureNotAvailable = (featureName: string) => {
    Alert.alert(
      featureName,
      'Cette fonctionnalité sera entièrement disponible dans une prochaine mise à jour.',
      [{ text: 'Compris', style: 'default' }]
    );
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase();
  };

  const getKYCStatus = () => {
    if (user?.is_verified) return { label: 'Vérifié', color: '#10b981', icon: '✅' };
    return { label: 'Non vérifié', color: '#f59e0b', icon: '⏳' };
  };

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const kyc = getKYCStatus();

  const kycDocs = user?.kyc_documents || [];
  const hasID = !!kycDocs.find((d: any) => d.document_type === 'ID');
  const hasSelfie = !!kycDocs.find((d: any) => d.document_type === 'SELFIE');
  const hasAddress = !!kycDocs.find((d: any) => d.document_type === 'PROOF_OF_ADDRESS');
  const allKycDone = hasID && hasSelfie && hasAddress;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* Header profil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.fullName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {/* KYC Badge */}
          <View style={[styles.kycBadge, { backgroundColor: kyc.color + '20' }]}>
            <Text style={styles.kycIcon}>{kyc.icon}</Text>
            <Text style={[styles.kycText, { color: kyc.color }]}>{kyc.label}</Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
            <Text style={styles.editBtnText}>✏️ Modifier le profil</Text>
          </TouchableOpacity>
        </View>

        {/* Infos personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Informations personnelles</Text>
          <View style={styles.infoCard}>
            {[
              { icon: '👤', label: 'Nom complet', value: `${user?.first_name} ${user?.last_name}` },
              { icon: '📧', label: 'Email', value: user?.email },
              { icon: '📱', label: 'Téléphone', value: user?.phone || 'Non renseigné' },
              { icon: '🏙️', label: 'Ville', value: user?.city || 'Non renseigné' },
              { icon: '🌍', label: 'Pays', value: user?.country || 'Non renseigné' },
              { icon: '📅', label: 'Membre depuis', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : '—' },
            ].map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoIcon}>{item.icon}</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* KYC Section */}
        {!user?.is_verified && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔐 Vérification KYC</Text>
            <View style={styles.kycCard}>
              <Text style={styles.kycCardIcon}>📋</Text>
              <Text style={styles.kycCardTitle}>Vérifiez votre identité</Text>
              <Text style={styles.kycCardText}>
                Complétez la vérification KYC pour débloquer toutes les fonctionnalités de trading BRVM
              </Text>
              <View style={styles.kycSteps}>
                {[
                  { step: '1', label: 'Pièce d\'identité', done: hasID },
                  { step: '2', label: 'Selfie avec ID', done: hasSelfie },
                  { step: '3', label: 'Justificatif domicile', done: hasAddress },
                ].map(item => (
                  <View key={item.step} style={styles.kycStep}>
                    <View style={[styles.kycStepDot, item.done && styles.kycStepDotDone]}>
                      <Text style={styles.kycStepNum}>{item.done ? '✓' : item.step}</Text>
                    </View>
                    <Text style={styles.kycStepLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {allKycDone ? (
                <View style={[styles.kycBtn, { backgroundColor: '#10b981' }]}>
                  <Text style={styles.kycBtnText}>⏳ Documents en cours de vérification</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.kycBtn} onPress={() => setKycModal(true)}>
                  <Text style={styles.kycBtnText}>🚀 Continuer la vérification</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Administration (Staff Only) */}
        {(user?.is_staff || user?.is_superuser) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>🛡️ Administration</Text>
            <View style={[styles.menuCard, { borderColor: '#f59e0b40' }]}>
              <TouchableOpacity 
                style={styles.menuRow}
                onPress={() => router.push('/admin/ads' as any)}
              >
                <Text style={styles.menuIcon}>📢</Text>
                <Text style={styles.menuLabel}>Gérer les annonces</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuRow}
                onPress={() => handleFeatureNotAvailable('Gestion Membres Club')}
              >
                <Text style={styles.menuIcon}>🤝</Text>
                <Text style={styles.menuLabel}>Membres du Club</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Espace Coach (Coach Only) */}
        {coachProfile && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#8b5cf6' }]}>🏆 Espace Coach</Text>
            <View style={[styles.menuCard, { borderColor: '#8b5cf640' }]}>
              <TouchableOpacity 
                style={styles.menuRow}
                onPress={() => router.push('/coach/post-tip' as any)}
              >
                <Text style={styles.menuIcon}>💡</Text>
                <Text style={styles.menuLabel}>Publier une recommandation</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuRow}
                onPress={() => router.push('/coach/courses' as any)}
              >
                <Text style={styles.menuIcon}>🎓</Text>
                <Text style={styles.menuLabel}>Gérer mes cours Academy</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuRow}
                onPress={() => handleFeatureNotAvailable('Analyse Performance')}
              >
                <Text style={styles.menuIcon}>📈</Text>
                <Text style={styles.menuLabel}>Ma Performance</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Sécurité</Text>
          <View style={styles.menuCard}>
            {[
              { icon: '🔑', label: 'Changer le mot de passe', arrow: true },
              { icon: '📱', label: 'Authentification 2FA', arrow: true, badge: 'Bientôt' },
              { icon: '📋', label: 'Historique des connexions', arrow: true },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuRow}
                onPress={() => handleFeatureNotAvailable(item.label)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <View style={styles.menuRight}>
                  {item.badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.arrow && <Text style={styles.menuArrow}>›</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Préférences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Préférences</Text>
          <View style={styles.menuCard}>
            {[
              { icon: '🔔', label: 'Notifications', arrow: true },
              { icon: '🌍', label: 'Langue', value: 'Français', arrow: true },
              { icon: '💱', label: 'Devise', value: 'FCFA (XOF)', arrow: true },
              { icon: '🎨', label: 'Thème', value: isDark ? 'Sombre' : 'Clair', onPress: toggleTheme },
            ].map((item: any) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, { borderBottomColor: colors.border }]}
                onPress={item.onPress || (() => handleFeatureNotAvailable(item.label))}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <View style={styles.menuRight}>
                  {item.value && <Text style={[styles.menuValue, { color: colors.subtext }]}>{item.value}</Text>}
                  <Text style={[styles.menuArrow, { color: colors.subtext }]}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Support</Text>
          <View style={styles.menuCard}>
            {[
              { icon: '❓', label: 'FAQ', arrow: true },
              { icon: '💬', label: 'Chat support', arrow: true },
              { icon: '📄', label: 'Conditions d\'utilisation', arrow: true },
              { icon: '🔏', label: 'Politique de confidentialité', arrow: true },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuRow}
                onPress={() => handleFeatureNotAvailable(item.label)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Version */}
        <Text style={styles.version}>BEDOU Magique v1.0.0</Text>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal KYC */}
      <Modal visible={kycModal} animationType="slide" transparent onRequestClose={() => setKycModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔐 Vérification KYC</Text>
              <TouchableOpacity onPress={() => setKycModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.kycModalSubtitle}>
                Importez vos documents pour valider votre compte.
              </Text>

              {[ 
                { id: 'ID', title: 'Pièce d\'identité', desc: 'Carte nationale d\'identité ou Passeport', done: hasID },
                { id: 'SELFIE', title: 'Selfie', desc: 'Prenez un selfie en direct avec la caméra', done: hasSelfie },
                { id: 'PROOF_OF_ADDRESS', title: 'Justificatif de domicile', desc: 'Facture d\'électricité, d\'eau ou relevé bancaire', done: hasAddress }
              ].map(doc => (
                <View key={doc.id} style={styles.kycDocRow}>
                  <View style={styles.kycDocInfo}>
                    <Text style={styles.kycDocTitle}>{doc.title}</Text>
                    <Text style={styles.kycDocDesc}>{doc.desc}</Text>
                  </View>
                  {doc.done ? (
                    <View style={styles.kycDocDoneBtn}>
                      <Text style={styles.kycDocBtnTextDone}>Envoyé ✅</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.kycDocUploadBtn} 
                      onPress={() => pickImage(doc.id)}
                      disabled={kycUploading}
                    >
                      {kycUploading ? <ActivityIndicator color="#38bdf8" /> : <Text style={styles.kycDocBtnText}>{doc.id === 'SELFIE' ? 'Caméra' : 'Importer'}</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              ))}

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Modifier Profil */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Modifier le profil</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalRow}>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalLabel}>Prénom</Text>
                  <TextInput style={styles.modalInput} value={firstName}
                    onChangeText={setFirstName} placeholderTextColor="#64748b" />
                </View>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalLabel}>Nom</Text>
                  <TextInput style={styles.modalInput} value={lastName}
                    onChangeText={setLastName} placeholderTextColor="#64748b" />
                </View>
              </View>

              <Text style={styles.modalLabel}>Téléphone</Text>
              <TextInput style={styles.modalInput} value={phone}
                onChangeText={setPhone} keyboardType="phone-pad"
                placeholderTextColor="#64748b" />

              <Text style={styles.modalLabel}>Ville</Text>
              <TextInput style={styles.modalInput} value={city}
                onChangeText={setCity} placeholder="ex: Dakar"
                placeholderTextColor="#64748b" />

              <Text style={styles.modalLabel}>Pays</Text>
              <TextInput style={styles.modalInput} value={country}
                onChangeText={setCountry} placeholder="ex: Sénégal"
                placeholderTextColor="#64748b" />

              <TouchableOpacity
                style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
                onPress={handleUpdateProfile}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#0f172a" />
                  : <Text style={styles.saveBtnText}>✅ Enregistrer</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  // Header profil
  profileHeader: { alignItems: 'center', padding: 24, paddingTop: 16 },
  avatarLarge: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#38bdf8', justifyContent: 'center',
    alignItems: 'center', marginBottom: 16,
    borderWidth: 3, borderColor: '#38bdf840',
  },
  avatarText: { color: '#0f172a', fontSize: 32, fontWeight: '800' },
  fullName: { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  email: { color: '#94a3b8', fontSize: 14, marginBottom: 12 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  kycIcon: { fontSize: 14 },
  kycText: { fontSize: 13, fontWeight: '600' },
  editBtn: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  editBtnText: { color: '#38bdf8', fontSize: 14, fontWeight: '600' },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', marginBottom: 10 },

  // Info card
  infoCard: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  infoIcon: { fontSize: 18, marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { color: '#64748b', fontSize: 11, marginBottom: 2 },
  infoValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },

  // KYC Card
  kycCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#f59e0b40', alignItems: 'center' },
  kycCardIcon: { fontSize: 40, marginBottom: 12 },
  kycCardTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kycCardText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  kycSteps: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  kycStep: { alignItems: 'center', gap: 8 },
  kycStepDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  kycStepDotDone: { backgroundColor: '#10b981' },
  kycStepNum: { color: '#94a3b8', fontWeight: '700' },
  kycStepLabel: { color: '#64748b', fontSize: 10, textAlign: 'center', maxWidth: 70 },
  kycBtn: { backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  kycBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 14 },

  // Menu cards
  menuCard: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { flex: 1, color: '#f1f5f9', fontSize: 14 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuValue: { color: '#64748b', fontSize: 13 },
  menuArrow: { color: '#64748b', fontSize: 20 },
  menuBadge: { backgroundColor: '#38bdf820', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  menuBadgeText: { color: '#38bdf8', fontSize: 10, fontWeight: '700' },

  // Footer
  version: { color: '#334155', fontSize: 12, textAlign: 'center', marginBottom: 16 },
  logoutBtn: {
    marginHorizontal: 16, backgroundColor: '#ef444420', borderWidth: 1,
    borderColor: '#ef4444', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 16,
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  closeBtn: { color: '#94a3b8', fontSize: 20 },
  modalRow: { flexDirection: 'row', gap: 12 },
  modalHalf: { flex: 1 },
  modalLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 6, marginTop: 14 },
  modalInput: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#f1f5f9', fontSize: 14 },
  saveBtn: { backgroundColor: '#38bdf8', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },

  // KYC details
  kycModalSubtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20 },
  kycDocRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  kycDocInfo: { flex: 1, paddingRight: 10 },
  kycDocTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  kycDocDesc: { color: '#64748b', fontSize: 11, lineHeight: 16 },
  kycDocUploadBtn: { backgroundColor: '#38bdf820', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#38bdf8' },
  kycDocDoneBtn: { backgroundColor: '#10b98120', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#10b981' },
  kycDocBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  kycDocBtnTextDone: { color: '#10b981', fontSize: 12, fontWeight: '700' },
});
