import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Image, Modal,
  TextInput, Switch, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';

export default function CoachCoursesScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [isFree, setIsFree] = useState(true);
  const [level, setLevel] = useState('Débutant');
  const [category, setCategory] = useState('Prudent');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const res = await apiClient.get('/coaches/my-courses/');
      setCourses(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!title || !description) {
      Alert.alert('Champs requis', 'Le titre et la description sont obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/coaches/my-courses/', {
        title,
        description,
        price: isFree ? 0 : parseFloat(price),
        is_free: isFree,
        level,
        category,
        image_url: imageUrl || 'https://via.placeholder.com/400x200',
      });
      setModalVisible(false);
      resetForm();
      // Rediriger directement vers la gestion des leçons du nouveau cours
      router.push(`/coach/${res.data.id}` as any);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer le cours');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('0');
    setIsFree(true);
    setLevel('Débutant');
    setCategory('Prudent');
    setImageUrl('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Mes Cours Academy</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadCourses} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={60} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Vous n'avez pas encore publié de cours.</Text>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
                <Text style={styles.createBtnText}>Créer mon premier cours</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/coach/${item.id}` as any)}
            >
              <Image source={{ uri: item.image_url }} style={styles.courseImage} />
              <View style={styles.courseInfo}>
                <Text style={[styles.courseTitle, { color: colors.text }]}>{item.title}</Text>
                <View style={styles.courseBadges}>
                  <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{item.level}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#10b98120' }]}>
                    <Text style={[styles.badgeText, { color: '#10b981' }]}>{item.is_free ? 'Gratuit' : `${Math.round(item.price)} FCFA`}</Text>
                  </View>
                </View>
                <Text style={[styles.lessonsCount, { color: colors.subtext }]}>
                  {item.lessons?.length || 0} leçon(s)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal Ajout Cours */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau Cours</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.text }]}>Titre du cours</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Maîtriser l'analyse technique"
                placeholderTextColor={colors.subtext}
              />

              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="Décrivez ce que les membres vont apprendre..."
                placeholderTextColor={colors.subtext}
              />

              <Text style={[styles.label, { color: colors.text }]}>URL de l'image</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
                placeholderTextColor={colors.subtext}
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Cours Gratuit</Text>
                <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: colors.primary }} />
              </View>

              {!isFree && (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>Prix (FCFA)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.text }]}>Niveau</Text>
              <View style={styles.levelRow}>
                {['Débutant', 'Intermédiaire', 'Expert'].map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[
                      styles.levelBtn,
                      { borderColor: colors.border },
                      level === l && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setLevel(l)}
                  >
                    <Text style={[styles.levelLabel, { color: level === l ? '#fff' : colors.subtext }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
                onPress={handleSaveCourse}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Créer le cours</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 5 },
  title: { fontSize: 18, fontWeight: '800' },
  addBtn: { padding: 5 },
  listContent: { padding: 20 },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  courseImage: { width: 70, height: 70, borderRadius: 12 },
  courseInfo: { flex: 1, marginLeft: 15 },
  courseTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  courseBadges: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  lessonsCount: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 14, paddingHorizontal: 40 },
  createBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 15 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  textArea: { height: 100, borderRadius: 12, padding: 16, fontSize: 15, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  levelRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  levelBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelLabel: { fontSize: 12, fontWeight: '700' },
  saveBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
