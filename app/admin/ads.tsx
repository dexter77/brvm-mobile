import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

export default function AdminAdsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [ctaText, setCtaText] = useState('Découvrir');
  const [ctaLink, setCtaLink] = useState('/club');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ads/');
      setAds(res.data);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les annonces');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setSelectedImage(null);
    setCtaText('Découvrir');
    setCtaLink('/club');
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!title || !description || (!selectedImage && !editingId)) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    const formData = new FormData() as any;
    formData.append('title', title);
    formData.append('description', description);
    formData.append('cta_text', ctaText);
    formData.append('cta_link', ctaLink);
    formData.append('is_active', isActive);

    if (selectedImage && selectedImage.uri) {
      formData.append('image', {
        uri: selectedImage.uri,
        name: 'ad_image.jpg',
        type: 'image/jpeg',
      });
    }

    try {
      if (editingId) {
        await apiClient.patch(`/ads/${editingId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post('/ads/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setModalVisible(false);
      resetForm();
      loadAds();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'annonce');
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer cette annonce ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/ads/${id}/`);
              loadAds();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'annonce');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (ad: any) => {
    setEditingId(ad.id);
    setTitle(ad.title);
    setDescription(ad.description);
    setSelectedImage({ uri: ad.image }); // On garde l'URI existante pour l'aperçu
    setCtaText(ad.cta_text);
    setCtaLink(ad.cta_link);
    setIsActive(ad.is_active);
    setModalVisible(true);
  };

  const toggleStatus = async (ad: any) => {
    try {
      await apiClient.patch(`/ads/${ad.id}/`, { is_active: !ad.is_active });
      loadAds();
    } catch (e) {
      Alert.alert('Erreur', 'Échec de la mise à jour');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Gestion des Pubs</Text>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.primary }]} 
          onPress={() => { resetForm(); setModalVisible(true); }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {ads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 50, marginBottom: 10 }}>📢</Text>
              <Text style={{ color: colors.subtext, fontSize: 16 }}>Aucune annonce configurée</Text>
            </View>
          ) : (
            ads.map((ad) => (
              <View key={ad.id} style={[styles.adCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.adCardHeader}>
                  <Text style={[styles.adTitle, { color: colors.text }]} numberOfLines={1}>{ad.title}</Text>
                  <Switch 
                    value={ad.is_active} 
                    onValueChange={() => toggleStatus(ad)}
                    trackColor={{ false: '#334155', true: colors.primary + '80' }}
                    thumbColor={ad.is_active ? colors.primary : '#94a3b8'}
                  />
                </View>
                <Text style={[styles.adDesc, { color: colors.subtext }]} numberOfLines={2}>{ad.description}</Text>
                <View style={styles.adActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(ad)}>
                    <Ionicons name="pencil" size={18} color="#38bdf8" />
                    <Text style={[styles.actionText, { color: '#38bdf8' }]}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(ad.id)}>
                    <Ionicons name="trash" size={18} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal Formulaire */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Titre de l'annonce *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: colors.text, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Rejoignez Le Club"
                placeholderTextColor={colors.subtext}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description courte et percutante..."
                placeholderTextColor={colors.subtext}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Image publicitaire *</Text>
              <TouchableOpacity 
                style={[styles.imagePicker, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: colors.border }]} 
                onPress={pickImage}
              >
                {selectedImage ? (
                  <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="image-outline" size={40} color={colors.subtext} />
                    <Text style={{ color: colors.subtext, marginTop: 8 }}>Choisir une image locale</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Texte du bouton</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: colors.text, borderColor: colors.border }]}
                    value={ctaText}
                    onChangeText={setCtaText}
                    placeholder="Découvrir"
                    placeholderTextColor={colors.subtext}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.label}>Route / Lien</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: colors.text, borderColor: colors.border }]}
                    value={ctaLink}
                    onChangeText={setCtaLink}
                    placeholder="/club ou https://..."
                    placeholderTextColor={colors.subtext}
                  />
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={[styles.label, { marginTop: 0 }]}>Activer l'annonce</Text>
                <Switch 
                  value={isActive} 
                  onValueChange={setIsActive}
                  trackColor={{ false: '#334155', true: colors.primary + '80' }}
                  thumbColor={isActive ? colors.primary : '#94a3b8'}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: { fontSize: 20, fontWeight: '800' },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  adCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  adCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  adTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 10 },
  adDesc: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  adActions: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: '#33415540', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 8, marginTop: 16, fontWeight: '600' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, backgroundColor: 'rgba(0,0,0,0.05)', padding: 12, borderRadius: 12 },
  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 30, marginBottom: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  imagePicker: {
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
