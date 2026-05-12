import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';

import apiClient from '../../src/api/client';
import { ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

const QUESTIONS = [
  {
    id: 1,
    question: "Quel est votre objectif principal d'investissement ?",
    options: [
      { label: "Protéger mon capital", value: 'prudent', icon: '🛡️' },
      { label: "Générer des revenus réguliers", value: 'equilibre', icon: '💰' },
      { label: "Faire fructifier mon capital à long terme", value: 'dynamique', icon: '🚀' },
    ]
  },
  {
    id: 2,
    question: "Pendant combien de temps comptez-vous laisser votre argent investi ?",
    options: [
      { label: "Moins de 2 ans", value: 'prudent', icon: '⏳' },
      { label: "Entre 2 et 5 ans", value: 'equilibre', icon: '📅' },
      { label: "Plus de 5 ans", value: 'dynamique', icon: '♾️' },
    ]
  },
  {
    id: 3,
    question: "Quelle part de vos revenus souhaitez-vous investir chaque mois ?",
    options: [
      { label: "Moins de 10%", value: 'prudent', icon: '📉' },
      { label: "Entre 10% et 30%", value: 'equilibre', icon: '📊' },
      { label: "Plus de 30%", value: 'dynamique', icon: '📈' },
    ]
  },
  {
    id: 4,
    question: "Quelle est votre expérience avec la bourse ?",
    options: [
      { label: "Débutant (je découvre)", value: 'prudent', icon: '🌱' },
      { label: "Intermédiaire (quelques notions)", value: 'equilibre', icon: '📚' },
      { label: "Expert (je trade déjà)", value: 'dynamique', icon: '🧠' },
    ]
  },
  {
    id: 5,
    question: "Comment réagiriez-vous si votre Bedou perdait 15% en un mois ?",
    options: [
      { label: "Je vends tout par peur", value: 'prudent', icon: '😨' },
      { label: "Je ne fais rien et j'attends", value: 'equilibre', icon: '😐' },
      { label: "J'en profite pour acheter plus", value: 'dynamique', icon: '🤑' },
    ]
  },
  {
    id: 6,
    question: "Comment évaluez-vous votre compréhension des risques financiers ?",
    options: [
      { label: "Faible, je préfère la sécurité", value: 'prudent', icon: '🛟' },
      { label: "Moyenne, je comprends le risque/rendement", value: 'equilibre', icon: '⚖️' },
      { label: "Élevée, je maîtrise les fluctuations", value: 'dynamique', icon: '🔥' },
    ]
  }
];

export default function QuestionnaireScreen() {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (value: string) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setSaving(true);
      try {
        // Déterminer le profil final
        const counts: any = { prudent: 0, equilibre: 0, dynamique: 0 };
        newAnswers.forEach(a => counts[a]++);
        const profile = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        
        // Sauvegarder dans le backend
        await apiClient.patch('users/me/', { investor_profile: profile });
        
        router.replace({
          pathname: '/academy',
          params: { profile }
        } as any);
      } catch (e) {
        console.error("Save profile error", e);
      } finally {
        setSaving(false);
      }
    }
  };

  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.stepText, { color: colors.subtext }]}>
          Question {currentStep + 1}/{QUESTIONS.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View key={currentStep} entering={FadeInRight.duration(400)}>
          <Text style={[styles.question, { color: colors.text }]}>
            {QUESTIONS[currentStep].question}
          </Text>

          <View style={styles.optionsContainer}>
            {QUESTIONS[currentStep].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  backButton: { marginBottom: 20 },
  progressContainer: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  stepText: { fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: 25 },
  question: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    marginBottom: 40,
  },
  optionsContainer: { gap: 16 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionIcon: { fontSize: 30, marginRight: 15 },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
});
