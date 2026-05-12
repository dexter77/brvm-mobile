import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';
import { useAuth } from '../_layout';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { loginAuth } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez saisir email et mot de passe');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/auth/token/', { email, password });
      const { access, refresh } = res.data;
      if (!access || !refresh) throw new Error('Tokens manquants');
      await loginAuth(access, refresh);
    } catch (e: any) {
      Alert.alert('Erreur', 'Identifiants invalides');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false} 
        bounces={false}
      >

        {/* Top Decorative Background */}
        <View style={[styles.topBackground, { paddingTop: insets.top + 20, backgroundColor: colors.background }]} >
          <View style={styles.brandingHeader}>
            <View style={[styles.logoCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="trending-up" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>BEDOU Magique</Text>
            <Text style={[styles.brandSubtitle, { color: colors.subtext }]}>Gère ton djai en pro.</Text>
          </View>
        </View>

        {/* Floating Login Card */}
        <View style={[styles.floatingCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>Bon retour ! 👋</Text>
          <Text style={[styles.instructionText, { color: colors.subtext }]}>Connectez-vous à votre compte</Text>

          {/* Email Input */}
          <View style={[
            styles.inputContainer, 
            { backgroundColor: colors.background, borderColor: colors.border },
            isFocusedEmail && { borderColor: colors.primary }
          ]}>
            <Ionicons name="mail-outline" size={20} color={isFocusedEmail ? colors.primary : colors.subtext} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsFocusedEmail(true)}
              onBlur={() => setIsFocusedEmail(false)}
              placeholder="Adresse email"
              placeholderTextColor={colors.subtext}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          {/* Password Input */}
          <View style={[
            styles.inputContainer, 
            { backgroundColor: colors.background, borderColor: colors.border },
            isFocusedPassword && { borderColor: colors.primary }
          ]}>
            <Ionicons name="lock-closed-outline" size={20} color={isFocusedPassword ? colors.primary : colors.subtext} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setIsFocusedPassword(true)}
              onBlur={() => setIsFocusedPassword(false)}
              placeholder="Mot de passe"
              placeholderTextColor={colors.subtext}
              secureTextEntry
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.loginBtn, 
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              submitting && styles.loginBtnDisabled
            ]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.loginBtnText, { color: colors.background === '#0f172a' ? '#0f172a' : '#fff' }]}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Registration Link */}
        <View style={styles.bottomFooter}>
          <Text style={[styles.registerText, { color: colors.subtext }]}>Vous êtes nouveau ? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={[styles.registerHighlight, { color: colors.primary }]}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    position: 'relative',
  },
  topBackground: {
    height: height * 0.45,
    width: '100%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  brandingHeader: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    marginTop: 6,
    opacity: 0.9,
  },
  floatingCard: {
    marginHorizontal: 24,
    marginTop: -80, // Negative margin to overlap the top background
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 58,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  registerText: {
    fontSize: 14,
  },
  registerHighlight: {
    fontSize: 14,
    fontWeight: '700',
  },
});

