import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';

export default function CoachCourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Lesson state
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [submittingLesson, setSubmittingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonOrder, setLessonOrder] = useState('1');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');

  // Course edit state
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [isFree, setIsFree] = useState(true);
  const [level, setLevel] = useState('Débutant');
  const [category, setCategory] = useState('Prudent');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => { loadCourse(); }, [id]);

  const loadCourse = async () => {
    try {
      const res = await apiClient.get('/academy/courses/' + id + '/');
      setCourse(res.data);
      // Setup edit form
      setTitle(res.data.title);
      setDescription(res.data.description);
      setPrice(res.data.price?.toString() || '0');
      setIsFree(res.data.is_free);
      setLevel(res.data.level);
      setCategory(res.data.category);
      setImageUrl(res.data.image_url);

      if (res.data.lessons?.length === 0) {
        setLessonModalVisible(true);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger le cours');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle || !lessonContent) {
      Alert.alert('Champs requis', 'Le titre et le contenu sont obligatoires');
      return;
    }

    setSubmittingLesson(true);
    try {
      if (editingLessonId) {
        await apiClient.patch(`/coaches/${id}/manage-lesson/${editingLessonId}/`, {
          title: lessonTitle,
          content: lessonContent,
          order: parseInt(lessonOrder) || 1,
          video_url: lessonVideoUrl,
        });
      } else {
        await apiClient.post(`/coaches/${id}/add-lesson/`, {
          title: lessonTitle,
          content: lessonContent,
          order: parseInt(lessonOrder) || 1,
          video_url: lessonVideoUrl,
        });
      }
      setLessonModalVisible(false);
      resetLessonForm();
      loadCourse();
      Alert.alert('✅ Succès', editingLessonId ? 'Leçon mise à jour !' : 'La leçon a été ajoutée !');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la leçon');
    } finally {
      setSubmittingLesson(false);
    }
  };

  const deleteLesson = (lessonId: number) => {
    Alert.alert(
      'Supprimer la leçon',
      'Voulez-vous vraiment supprimer cette leçon ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/coaches/${id}/manage-lesson/${lessonId}/`);
              loadCourse();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer la leçon');
            }
          }
        }
      ]
    );
  };

  const handleUpdateCourse = async () => {
    setSubmittingCourse(true);
    try {
      await apiClient.patch(`/coaches/${id}/manage-course/`, {
        title,
        description,
        price: isFree ? 0 : parseFloat(price),
        is_free: isFree,
        level,
        category,
        image_url: imageUrl,
      });
      setCourseModalVisible(false);
      loadCourse();
      Alert.alert('✅ Succès', 'Cours mis à jour !');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le cours');
    } finally {
      setSubmittingCourse(false);
    }
  };

  const deleteCourse = () => {
    Alert.alert(
      'Supprimer le cours',
      'Voulez-vous vraiment supprimer ce cours ainsi que toutes ses leçons ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Tout supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/coaches/${id}/manage-course/`);
              router.back();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer le cours');
            }
          }
        }
      ]
    );
  };

  const resetLessonForm = () => {
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonContent('');
    setLessonVideoUrl('');
    setLessonOrder((course?.lessons?.length + 1).toString());
  };

  const editLesson = (lesson: any) => {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content);
    setLessonVideoUrl(lesson.video_url || '');
    setLessonOrder(lesson.order?.toString() || '1');
    setLessonModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Gestion du cours</Text>
        <TouchableOpacity onPress={() => setCourseModalVisible(true)}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.courseHeader, { borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[styles.courseTitle, { color: colors.text, flex: 1 }]}>{course?.title}</Text>
          </View>
          <Text style={[styles.courseDesc, { color: colors.subtext }]}>{course?.description}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Leçons</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{course?.lessons?.length || 0}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Niveau</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{course?.level}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Prix</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {course?.is_free ? 'Gratuit' : `${Math.round(course?.price || 0)} FCFA`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.lessonsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contenu du cours</Text>
            <TouchableOpacity 
              style={[styles.addLessonBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                resetLessonForm();
                setLessonModalVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addLessonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {course?.lessons?.length === 0 ? (
            <View style={styles.emptyLessons}>
              <Ionicons name="book-outline" size={48} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Aucune leçon pour le moment.</Text>
            </View>
          ) : (
            course?.lessons?.map((lesson: any, index: number) => (
              <View key={lesson.id} style={[styles.lessonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.lessonNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.lessonNumberText}>{lesson.order || index + 1}</Text>
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
                  <Text style={[styles.lessonSnippet, { color: colors.subtext }]} numberOfLines={1}>
                    {lesson.content}
                  </Text>
                </View>
                <View style={styles.lessonActions}>
                  <TouchableOpacity onPress={() => editLesson(lesson)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteLesson(lesson.id)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={[styles.deleteCourseBtn, { borderColor: '#ef4444' }]} 
          onPress={deleteCourse}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={styles.deleteCourseText}>Supprimer le cours entier</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Leçon (Add/Edit) */}
      <Modal visible={lessonModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingLessonId ? 'Modifier la Leçon' : 'Nouvelle Leçon'}
              </Text>
              <TouchableOpacity onPress={() => setLessonModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.text }]}>Titre de la leçon</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={lessonTitle}
                onChangeText={setLessonTitle}
                placeholder="Ex: Les bases du graphique en bougies"
                placeholderTextColor={colors.subtext}
              />

              <Text style={[styles.label, { color: colors.text }]}>Ordre d'affichage</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={lessonOrder}
                onChangeText={setLessonOrder}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: colors.text }]}>Lien de la vidéo (MP4, YouTube...)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={lessonVideoUrl}
                onChangeText={setLessonVideoUrl}
                placeholder="https://..."
                placeholderTextColor={colors.subtext}
              />

              <Text style={[styles.label, { color: colors.text }]}>Contenu</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={lessonContent}
                onChangeText={setLessonContent}
                multiline
                numberOfLines={12}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, submittingLesson && { opacity: 0.6 }]}
                onPress={handleSaveLesson}
                disabled={submittingLesson}
              >
                {submittingLesson ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Course */}
      <Modal visible={courseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Modifier le Cours</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.text }]}>Titre</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text, height: 100 }]}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>Cours Gratuit</Text>
                <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: colors.primary }} />
              </View>

              {!isFree && (
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text, marginTop: 10 }]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, submittingCourse && { opacity: 0.6 }]}
                onPress={handleUpdateCourse}
                disabled={submittingCourse}
              >
                {submittingCourse ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Mettre à jour le cours</Text>}
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
  scrollContent: { padding: 20 },
  courseHeader: { paddingBottom: 20, borderBottomWidth: 1, marginBottom: 20 },
  courseTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10 },
  courseDesc: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 12 },
  lessonsSection: { marginTop: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  addLessonBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 5 },
  addLessonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyLessons: { alignItems: 'center', padding: 40, marginTop: 20 },
  emptyText: { marginTop: 15, fontSize: 14 },
  lessonCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  lessonNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  lessonNumberText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  lessonInfo: { flex: 1, marginLeft: 15 },
  lessonTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  lessonSnippet: { fontSize: 12 },
  lessonActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 5 },
  deleteCourseBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderRadius: 16, 
    padding: 16, 
    marginTop: 40,
    gap: 10
  },
  deleteCourseText: { color: '#ef4444', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 15 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  textArea: { height: 250, borderRadius: 12, padding: 16, fontSize: 15, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  saveBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
