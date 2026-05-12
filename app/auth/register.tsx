import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';

// ✅ Pays UEMOA avec indicatifs et longueurs de numéros
const COUNTRIES = [
  { flag: '🇸🇳', name: 'Sénégal',       code: '+221', digits: 9  },
  { flag: '🇨🇮', name: 'Côte d\'Ivoire', code: '+225', digits: 10 },
  { flag: '🇧🇯', name: 'Bénin',          code: '+229', digits: 8  },
  { flag: '🇧🇫', name: 'Burkina Faso',   code: '+226', digits: 8  },
  { flag: '🇲🇱', name: 'Mali',           code: '+223', digits: 8  },
  { flag: '🇳🇪', name: 'Niger',          code: '+227', digits: 8  },
  { flag: '🇹🇬', name: 'Togo',           code: '+228', digits: 8  },
  { flag: '🇬🇼', name: 'Guinée-Bissau',  code: '+245', digits: 7  },
];

export default function RegisterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Sénégal par défaut

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Quand on change de pays, on réinitialise le numéro
  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country);
    setPhone('');
  };

  // Limiter la saisie au bon nombre de chiffres
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, ''); // Garder uniquement les chiffres
    if (cleaned.length <= selectedCountry.digits) {
      setPhone(cleaned);
    }
  };

  // Formater le numéro affiché
  const formatPhone = (digits: string, country: typeof COUNTRIES[0]) => {
    if (country.digits === 9) {
      // Sénégal: XX XXX XX XX
      return digits.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    } else if (country.digits === 10) {
      // Côte d'Ivoire: XX XX XX XX XX
      return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    } else {
      // 8 chiffres: XX XX XX XX
      return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
  };

  const validateStep1 = () => {
    if (!firstName || !lastName) {
      Alert.alert('Erreur', 'Prénom et nom requis');
      return false;
    }
    if (phone.length !== selectedCountry.digits) {
      Alert.alert('Erreur', `Le numéro ${selectedCountry.name} doit contenir ${selectedCountry.digits} chiffres`);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!email || !username || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return false;
    }
    if (!email.includes('@')) { Alert.alert('Erreur', 'Email invalide'); return false; }
    if (password.length < 8) { Alert.alert('Erreur', 'Mot de passe trop court (8 min)'); return false; }
    if (password !== confirmPassword) { Alert.alert('Erreur', 'Mots de passe différents'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!acceptTerms) { Alert.alert('Erreur', 'Acceptez les conditions'); return; }
    setSubmitting(true);
    try {
      await apiClient.post('/auth/register/register/', {
        first_name: firstName,
        last_name: lastName,
        phone: `${selectedCountry.code}${phone}`,
        country: selectedCountry.name,
        email,
        username,
        password,
        password_confirm: confirmPassword,
      });
      Alert.alert('🎉 Compte créé !', 'Connectez-vous maintenant.',
        [{ text: 'Se connecter', onPress: () => router.replace('/auth/login') }]
      );
    } catch (e: any) {
      const errors = e.response?.data;
      if (errors?.email) Alert.alert('Erreur', 'Email déjà utilisé');
      else if (errors?.username) Alert.alert('Erreur', 'Nom d\'utilisateur déjà pris');
      else Alert.alert('Erreur', 'Impossible de créer le compte');
    } finally {
      setSubmitting(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <View style={[
            styles.stepDot, 
            { backgroundColor: colors.card, borderColor: colors.border },
            step >= s && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}>
            <Text style={[
              styles.stepDotText, 
              { color: colors.subtext },
              step >= s && { color: colors.background }
            ]}>
              {step > s ? '✓' : s}
            </Text>
          </View>
          {s < 3 && <View style={[
            styles.stepLine, 
            { backgroundColor: colors.border },
            step > s && { backgroundColor: colors.primary }
          ]} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
            <Text style={[styles.backArrowText, { color: colors.primary }]}>← Retour</Text>
          </TouchableOpacity>
          <Text style={[styles.logo, { color: colors.primary }]}>💰 BEDOU Magique</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 1 ? '👤 Infos personnelles' : step === 2 ? '🔐 Votre compte' : '✅ Confirmation'}
          </Text>
        </View>

        <StepIndicator />

        {/* ===== ÉTAPE 1 ===== */}
        {step === 1 && (
          <View style={styles.form}>

            {/* Prénom + Nom */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: colors.subtext }]}>Prénom *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={firstName} onChangeText={setFirstName}
                  placeholder="Tamsir" placeholderTextColor={colors.subtext} />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: colors.subtext }]}>Nom *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={lastName} onChangeText={setLastName}
                  placeholder="Gueye" placeholderTextColor={colors.subtext} />
              </View>
            </View>

            {/* Sélection pays */}
            <Text style={[styles.label, { color: colors.subtext }]}>Pays *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryScroll}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.countryBtn, 
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedCountry.name === c.name && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                  ]}
                  onPress={() => handleCountrySelect(c)}
                >
                  <Text style={styles.countryFlag}>{c.flag}</Text>
                  <Text style={[
                    styles.countryName, 
                    { color: colors.subtext },
                    selectedCountry.name === c.name && { color: colors.primary }
                  ]}>
                    {c.name}
                  </Text>
                  <Text style={[
                    styles.countryCode, 
                    { color: colors.subtext },
                    selectedCountry.name === c.name && { color: colors.primary }
                  ]}>
                    {c.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Téléphone avec indicatif dynamique */}
            <Text style={[styles.label, { color: colors.subtext }]}>
              Téléphone * ({selectedCountry.digits} chiffres)
            </Text>
            <View style={styles.phoneRow}>
              {/* Indicatif pays */}
              <View style={[styles.phoneCodeBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <Text style={styles.phoneFlag}>{selectedCountry.flag}</Text>
                <Text style={[styles.phoneCode, { color: colors.primary }]}>{selectedCountry.code}</Text>
              </View>

              {/* Input numéro */}
              <TextInput
                style={[styles.input, styles.phoneInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formatPhone(phone, selectedCountry)}
                onChangeText={handlePhoneChange}
                placeholder={'X'.repeat(selectedCountry.digits)}
                placeholderTextColor={colors.subtext}
                keyboardType="phone-pad"
                maxLength={selectedCountry.digits + Math.floor(selectedCountry.digits / 2)}
              />
            </View>

            {/* Indicateur progression numéro */}
            <View style={[styles.phoneProgress, { backgroundColor: colors.border }]}>
              <View style={[
                styles.phoneProgressBar,
                { width: `${(phone.length / selectedCountry.digits) * 100}%`, backgroundColor: colors.primary },
                phone.length === selectedCountry.digits && { backgroundColor: colors.positive }
              ]} />
            </View>
            <Text style={[styles.phoneHint, { color: colors.subtext }]}>
              {phone.length}/{selectedCountry.digits} chiffres
              {phone.length === selectedCountry.digits ? ' ✅' : ''}
            </Text>

            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={() => validateStep1() && setStep(2)}>
              <Text style={[styles.nextBtnText, { color: colors.background }]}>Continuer →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== ÉTAPE 2 ===== */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.subtext }]}>Email *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={email} onChangeText={setEmail}
              placeholder="tamsir@example.com" placeholderTextColor={colors.subtext}
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={[styles.label, { color: colors.subtext }]}>Nom d'utilisateur *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={username} onChangeText={setUsername}
              placeholder="tamsir_gueye" placeholderTextColor={colors.subtext} autoCapitalize="none" />

            <Text style={[styles.label, { color: colors.subtext }]}>Mot de passe *</Text>
            <View style={styles.passwordRow}>
              <TextInput style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={password}
                onChangeText={setPassword} placeholder="Min. 8 caractères"
                placeholderTextColor={colors.subtext} secureTextEntry={!showPassword} />
              <TouchableOpacity style={[styles.eyeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowPassword(!showPassword)}>
                <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Force mot de passe */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1,2,3,4].map(i => (
                  <View key={i} style={[styles.strengthBar, {
                    backgroundColor: password.length >= i*3
                      ? i<=1 ? colors.negative : i<=2 ? '#f59e0b' : i<=3 ? colors.primary : colors.positive
                      : colors.border
                  }]} />
                ))}
                <Text style={[styles.strengthText, { color: colors.subtext }]}>
                  {password.length < 4 ? '🔴 Faible' : password.length < 8 ? '🟡 Moyen' : password.length < 12 ? '🔵 Fort' : '🟢 Excellent'}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.subtext }]}>Confirmer mot de passe *</Text>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                confirmPassword && password !== confirmPassword && { borderColor: colors.negative }
              ]}
              value={confirmPassword} onChangeText={setConfirmPassword}
              placeholder="Répétez" placeholderTextColor={colors.subtext} secureTextEntry={!showPassword} />
            {confirmPassword && password !== confirmPassword && (
              <Text style={[styles.errorText, { color: colors.negative }]}>⚠️ Mots de passe différents</Text>
            )}
            {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
              <Text style={[styles.successText, { color: colors.positive }]}>✅ Mots de passe identiques</Text>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setStep(1)}>
                <Text style={[styles.backBtnText, { color: colors.subtext }]}>← Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn2, { backgroundColor: colors.primary }]} onPress={() => validateStep2() && setStep(3)}>
                <Text style={[styles.nextBtnText, { color: colors.background }]}>Continuer →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===== ÉTAPE 3 ===== */}
        {step === 3 && (
          <View style={styles.form}>
            <View style={[styles.recapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.recapTitle, { color: colors.text }]}>📋 Récapitulatif</Text>
              {[
                { label: 'Prénom', value: firstName },
                { label: 'Nom', value: lastName },
                { label: 'Pays', value: `${selectedCountry.flag} ${selectedCountry.name}` },
                { label: 'Téléphone', value: `${selectedCountry.code} ${formatPhone(phone, selectedCountry)}` },
                { label: 'Email', value: email },
                { label: 'Utilisateur', value: username },
              ].map(item => (
                <View key={item.label} style={[styles.recapRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.recapLabel, { color: colors.subtext }]}>{item.label}</Text>
                  <Text style={[styles.recapValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(!acceptTerms)}>
              <View style={[
                styles.checkbox, 
                { borderColor: colors.border },
                acceptTerms && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                {acceptTerms && <Text style={[styles.checkmark, { color: colors.background }]}>✓</Text>}
              </View>
              <Text style={[styles.termsText, { color: colors.subtext }]}>
                J'accepte les <Text style={[styles.termsLink, { color: colors.primary }]}>conditions d'utilisation</Text> de BEDOU Magique
              </Text>
            </TouchableOpacity>

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setStep(2)}>
                <Text style={[styles.backBtnText, { color: colors.subtext }]}>← Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn2, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
                onPress={handleRegister} disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.background} size="small" />
                  : <Text style={[styles.nextBtnText, { color: colors.background }]}>🎉 Créer mon compte</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.subtext }]}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  backArrow: { alignSelf: 'flex-start', marginBottom: 12 },
  backArrowText: { color: '#38bdf8', fontSize: 14, fontWeight: '600' },
  logo: { fontSize: 22, fontWeight: '800', color: '#38bdf8', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  stepRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 28, paddingHorizontal: 60 },
  stepDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  stepDotText: { color: '#64748b', fontWeight: '700' },
  stepDotTextActive: { color: '#0f172a' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#334155', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#38bdf8' },
  form: { paddingHorizontal: 20, paddingBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  label: { color: '#94a3b8', fontSize: 12, marginBottom: 6, marginTop: 14, fontWeight: '500' },
  input: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: '#f1f5f9', fontSize: 14 },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  successText: { color: '#10b981', fontSize: 12, marginTop: 4 },

  // Pays
  countryScroll: { marginTop: 4, marginBottom: 4 },
  countryBtn: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    marginRight: 10, backgroundColor: '#1e293b', minWidth: 90,
  },
  countryBtnActive: { backgroundColor: '#38bdf820', borderColor: '#38bdf8' },
  countryFlag: { fontSize: 24, marginBottom: 4 },
  countryName: { color: '#64748b', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  countryNameActive: { color: '#38bdf8' },
  countryCode: { color: '#475569', fontSize: 10, marginTop: 2 },
  countryCodeActive: { color: '#38bdf8' },

  // Téléphone
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  phoneCodeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#38bdf8',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13,
  },
  phoneFlag: { fontSize: 18 },
  phoneCode: { color: '#38bdf8', fontWeight: '700', fontSize: 14 },
  phoneInput: { flex: 1 },
  phoneProgress: { height: 3, backgroundColor: '#334155', borderRadius: 2, marginTop: 8 },
  phoneProgressBar: { height: 3, backgroundColor: '#38bdf8', borderRadius: 2 },
  phoneProgressComplete: { backgroundColor: '#10b981' },
  phoneHint: { color: '#64748b', fontSize: 11, marginTop: 4 },

  // Mot de passe
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderLeftWidth: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthText: { color: '#94a3b8', fontSize: 11, minWidth: 80 },

  // Boutons
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  nextBtn: { backgroundColor: '#38bdf8', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  nextBtn2: { flex: 1, backgroundColor: '#38bdf8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  nextBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  backBtn: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingVertical: 14, alignItems: 'center' },
  backBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },

  // Recap
  recapCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  recapTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  recapLabel: { color: '#94a3b8', fontSize: 13 },
  recapValue: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  checkmark: { color: '#0f172a', fontSize: 12, fontWeight: '700' },
  termsText: { flex: 1, color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  termsLink: { color: '#38bdf8', fontWeight: '600' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 24 },
  footerText: { color: '#94a3b8' },
  footerLink: { color: '#38bdf8', fontWeight: '700' },
});
