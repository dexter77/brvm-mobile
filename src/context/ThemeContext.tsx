import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  positive: string;
  negative: string;
}

const lightColors: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  subtext: '#64748b',
  border: '#e2e8f0',
  primary: '#6366f1',
  tabBar: '#ffffff',
  tabBarActive: '#6366f1',
  tabBarInactive: '#94a3b8',
  positive: '#10b981',
  negative: '#ef4444',
};

const darkColors: ThemeColors = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  subtext: '#94a3b8',
  border: '#334155',
  primary: '#38bdf8',
  tabBar: '#0f172a',
  tabBarActive: '#38bdf8',
  tabBarInactive: '#64748b',
  positive: '#22c55e',
  negative: '#f87171',
};

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>('dark'); // Default to dark as per existing app

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('user-theme');
      if (savedTheme) {
        setTheme(savedTheme as ThemeType);
      } else if (systemScheme) {
        setTheme(systemScheme);
      }
    };
    loadTheme();
  }, [systemScheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    AsyncStorage.setItem('user-theme', newTheme);
  };

  const colors = theme === 'light' ? lightColors : darkColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
