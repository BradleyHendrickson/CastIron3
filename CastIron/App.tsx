import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from './hooks/useAuth';
import MainApp from './components/MainApp';
import LoginScreen from './components/LoginScreen';
import { colors } from './constants/theme';

export default function App() {
  const { session, loading, signOut, isConfigured } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedText}>Loading...</Text>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={styles.center}>
        <Text style={[styles.mutedText, styles.configError]}>
          Supabase not configured. Create a .env file with EXPO_PUBLIC_SUPABASE_URL
          and EXPO_PUBLIC_SUPABASE_ANON_KEY. See .env.example.
        </Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <LoginScreen onSuccess={() => {}} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MainApp session={session} onSignOut={signOut} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedText: {
    color: colors.textDim,
    fontSize: 16,
  },
  configError: {
    textAlign: 'center',
    padding: 24,
  },
});
