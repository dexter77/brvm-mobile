import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import apiClient from '../../../src/api/client';
import YoutubePlayer from "react-native-youtube-iframe";

const { width } = Dimensions.get('window');

const getYouTubeVideoId = (url: string) => {
  if (!url) return null;
  const cleanUrl = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = cleanUrl.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function CoursePlayer() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [step, setStep] = useState(0);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [finishing, setFinishing] = useState(false);

  React.useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const res = await apiClient.get(`academy/courses/${id}/`);
      setCourse(res.data);
    } catch (e) {
      console.error("loadCourse error", e);
    } finally {
      setLoading(false);
    }
  };
  
  const content = course?.lessons || [];
  const current = content[step];

  const handleNext = async () => {
    if (step < content.length - 1) {
      setStep(step + 1);
    } else {
      setFinishing(true);
      try {
        await apiClient.post(`academy/courses/${id}/complete/`);
      } catch (e) {
        console.error("Error completing course", e);
      } finally {
        setFinishing(false);
        router.replace('/academy');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!current) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          {content.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.progressSegment, 
                { backgroundColor: i <= step ? colors.primary : colors.border }
              ]} 
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View key={step} entering={SlideInRight} exiting={FadeOut} style={styles.card}>
          {current.video_url ? (
            <View style={styles.videoContainer}>
              {getYouTubeVideoId(current.video_url) ? (
                <YoutubePlayer
                  key={getYouTubeVideoId(current.video_url)}
                  height={250}
                  play={false}
                  videoId={getYouTubeVideoId(current.video_url) || ''}
                  webViewProps={{
                    androidLayerType: 'hardware',
                    allowsFullscreenVideo: true,
                  }}
                />
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Ionicons name="warning-outline" size={32} color="#ef4444" />
                  <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 10 }}>
                    Lien vidéo non reconnu. Assurez-vous d'utiliser un lien YouTube valide.
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 5 }}>URL: {current.video_url}</Text>
                </View>
              )}
            </View>
          ) : (
            current.image_url && <Image source={{ uri: current.image_url }} style={styles.image} />
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
            <Text style={[styles.contentBody, { color: colors.text }]}>{current.content}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, { backgroundColor: colors.primary }]} 
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {step === content.length - 1 ? "Terminer le cours" : "Suivant"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  closeBtn: { padding: 5 },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scroll: { padding: 20 },
  card: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 100,
  },
  image: { width: '100%', height: 250 },
  videoContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: 250,
  },
  textContainer: { padding: 25 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  contentBody: { fontSize: 17, lineHeight: 26, opacity: 0.9 },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  nextBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
