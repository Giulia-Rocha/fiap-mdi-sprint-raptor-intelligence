import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      setError('Falha na autenticação. Verifique seu e-mail e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError('Por favor, informe seu e-mail para recuperar a senha.');
      return;
    }
    setError(null);
    // In a real app, call API here: await specsApi.forgotPassword(email)
    alert(`Um e-mail de recuperação foi enviado para: ${email}`);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={64} color={colors.accentBlue} />
          <Text style={[typography.displayMd, { color: colors.textPrimary, marginTop: spacing.md }]}>
            Bem-vindo ao Raptor Intelligence
          </Text>
          <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>
            Acesse sua conta para continuar
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[typography.labelSm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>E-mail</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.bgSurface, 
                color: colors.textPrimary,
                borderRadius: radius.md,
                borderColor: colors.borderSubtle
              }]}
              placeholder="seuemail@ford.com.br"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[typography.labelSm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Senha</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.bgSurface, 
                color: colors.textPrimary,
                borderRadius: radius.md,
                borderColor: colors.borderSubtle
              }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error && (
            <Text style={[typography.bodySm, { color: colors.accentRed, marginBottom: spacing.md }]}>
              {error}
            </Text>
          )}

          <TouchableOpacity 
            style={[
              styles.primaryButton,
              { backgroundColor: isLoading ? colors.bgElevated : colors.accentBlue, borderRadius: radius.md },
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={[typography.displayMd, { color: isLoading ? colors.textMuted : 'white' }]}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={handleForgotPassword}>
            <Text style={[typography.bodySm, { color: colors.accentBlue }]}>Esqueci minha senha</Text>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  primaryButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 16,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 24,
  },
});
