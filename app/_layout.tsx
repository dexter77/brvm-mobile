import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider as AppThemeProvider, useTheme } from '../src/context/ThemeContext';
import apiClient from '../src/api/client';

SplashScreen.preventAutoHideAsync();

// Configuration de l'affichage des notifications quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission notifications refusée');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'a894c031-3ffe-47e5-8561-8e6d62894b2f',
    });

    return tokenData.data;
  } catch (e) {
    console.log('Erreur token push:', e);
    return null;
  }
}

export const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        setIsAuthenticated(!!token);
      } catch (e) {
        console.error('Auth check error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Enregistrer le token push quand l'utilisateur se connecte
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().then(async (expoPushToken) => {
      if (expoPushToken) {
        try {
          await apiClient.post('/notifications/register-token/', {
            token: expoPushToken,
            platform: Platform.OS,
          });
          console.log('✅ Token push enregistré:', expoPushToken);
        } catch (e) {
          console.log('Erreur enregistrement token:', e);
        }
      }
    });
  }, [isAuthenticated]);

  const segments = useSegments();

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }

    SplashScreen.hideAsync();
  }, [isLoading, isAuthenticated, segments, rootNavigationState?.key, router]);

  const loginAuth = async (access: string, refresh: string) => {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    setIsAuthenticated(true);
    router.replace('/');
  };

  const logoutAuth = async () => {
    // Supprimer le token push à la déconnexion
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'a894c031-3ffe-47e5-8561-8e6d62894b2f',
      });
      await apiClient.delete('/notifications/register-token/', {
        data: { token: tokenData.data },
      });
    } catch (_) {}
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    setIsAuthenticated(false);
    router.replace('/auth/login');
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0f172a',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <AppThemeProvider>
      <AuthContext.Provider value={{ isAuthenticated, loginAuth, logoutAuth }}>
        <RootContent />
      </AuthContext.Provider>
    </AppThemeProvider>
  );
}

function RootContent() {
  const { colors, theme, isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
