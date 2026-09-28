import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSession } from '../session/SessionContext';
import { submitAuth } from './auth-submit';
import {
  getAuthAction,
  getAuthErrorMessage,
  getOtherAuthMode,
  type AuthMode,
} from './auth-screen-logic';
import { AUTH_COLORS } from './auth-screen-theme';

const MODE_COPY = {
  'sign-in': {
    title: 'Inicia sesión',
    description: 'Ingresa tus datos para acceder a tus cuentas.',
    submit: 'Iniciar sesión',
    submitting: 'Iniciando sesión…',
    alternativePrompt: '¿Aún no tienes una cuenta?',
    alternativeAction: 'Crear una cuenta',
  },
  'create-account': {
    title: 'Crea tu cuenta',
    description: 'Empieza con tu correo electrónico y una contraseña.',
    submit: 'Crear cuenta',
    submitting: 'Creando cuenta…',
    alternativePrompt: '¿Ya tienes una cuenta?',
    alternativeAction: 'Iniciar sesión',
  },
} as const;

type AuthControlFocus =
  | 'sign-in'
  | 'create-account'
  | 'password-toggle'
  | 'submit'
  | 'mode-alternative';

export function AuthScreen() {
  const { client, setTokens } = useSession();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  const keyboardBehavior =
    Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined;
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [focusedControl, setFocusedControl] = useState<AuthControlFocus | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const passwordInput = useRef<TextInput | null>(null);
  const copy = MODE_COPY[mode];

  const chooseMode = (nextMode: AuthMode) => {
    if (nextMode === mode || submissionLock.current) return;
    setMode(nextMode);
    setPassword('');
    setPasswordVisible(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      await submitAuth(
        getAuthAction(mode),
        { email, password },
        { post: client.post.bind(client), setTokens },
      );
    } catch (value: unknown) {
      setError(getAuthErrorMessage(value, mode));
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const selectMode = (nextMode: AuthMode) => () => chooseMode(nextMode);
  const switchMode = () => chooseMode(getOtherAuthMode(mode));

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: width < 480 ? 20 : isWide ? 48 : 32 },
          isWide ? styles.scrollContentWide : undefined,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <View style={[styles.layout, isWide ? styles.layoutWide : undefined]}>
          <View style={[styles.brand, isWide ? styles.brandWide : undefined]}>
            <View style={styles.wordmark}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>L</Text>
              </View>
              <Text style={styles.wordmarkText}>lukitas</Text>
            </View>
            <Text accessibilityRole="header" style={styles.brandHeading}>
              Tu dinero, más claro.
            </Text>
            <Text style={styles.brandDescription}>
              Organiza tus cuentas en distintas monedas y entiende cada saldo desde un solo lugar.
            </Text>
            <View style={styles.brandNote}>
              <View style={styles.brandNoteMark} />
              <Text style={styles.brandNoteText}>Para bancos, efectivo y billeteras digitales</Text>
            </View>
          </View>

          <View style={[styles.formCard, isWide ? styles.formCardWide : undefined]}>
            <Text accessibilityRole="header" style={styles.formTitle}>
              {copy.title}
            </Text>
            <Text style={styles.formDescription}>{copy.description}</Text>

            <View style={styles.modeSwitch}>
              <Pressable
                accessibilityLabel="Iniciar sesión"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting, selected: mode === 'sign-in' }}
                disabled={isSubmitting}
                onBlur={() => setFocusedControl(null)}
                onFocus={() => setFocusedControl('sign-in')}
                onPress={selectMode('sign-in')}
                style={({ pressed }) => [
                  styles.modeButton,
                  mode === 'sign-in' ? styles.modeButtonSelected : undefined,
                  focusedControl === 'sign-in' ? styles.controlFocused : undefined,
                  pressed ? styles.modeButtonPressed : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'sign-in' ? styles.modeButtonTextSelected : undefined,
                  ]}
                >
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Crear cuenta"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting, selected: mode === 'create-account' }}
                disabled={isSubmitting}
                onBlur={() => setFocusedControl(null)}
                onFocus={() => setFocusedControl('create-account')}
                onPress={selectMode('create-account')}
                style={({ pressed }) => [
                  styles.modeButton,
                  mode === 'create-account' ? styles.modeButtonSelected : undefined,
                  focusedControl === 'create-account' ? styles.controlFocused : undefined,
                  pressed ? styles.modeButtonPressed : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'create-account' ? styles.modeButtonTextSelected : undefined,
                  ]}
                >
                  Crear cuenta
                </Text>
              </Pressable>
            </View>

            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Correo electrónico</Text>
                <View style={[styles.inputShell, emailFocused ? styles.inputShellFocused : undefined]}>
                  <TextInput
                    accessibilityLabel="Correo electrónico"
                    accessibilityState={{ disabled: isSubmitting }}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    keyboardType="email-address"
                    onBlur={() => setEmailFocused(false)}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onSubmitEditing={() => passwordInput.current?.focus()}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={AUTH_COLORS.muted}
                    returnKeyType="next"
                    selectionColor={AUTH_COLORS.primary}
                    style={styles.input}
                    value={email}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Contraseña</Text>
                <View
                  style={[styles.inputShell, passwordFocused ? styles.inputShellFocused : undefined]}
                >
                  <TextInput
                    ref={passwordInput}
                    accessibilityLabel="Contraseña"
                    accessibilityState={{ disabled: isSubmitting }}
                    autoCapitalize="none"
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    editable={!isSubmitting}
                    onBlur={() => setPasswordFocused(false)}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onSubmitEditing={() => void handleSubmit()}
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor={AUTH_COLORS.muted}
                    returnKeyType="go"
                    secureTextEntry={!passwordVisible}
                    selectionColor={AUTH_COLORS.primary}
                    style={styles.input}
                    value={password}
                  />
                  <Pressable
                    accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSubmitting, expanded: passwordVisible }}
                    disabled={isSubmitting}
                    onBlur={() => setFocusedControl(null)}
                    onFocus={() => setFocusedControl('password-toggle')}
                    onPress={() => setPasswordVisible((visible) => !visible)}
                    style={({ pressed }) => [
                      styles.passwordToggle,
                      focusedControl === 'password-toggle' ? styles.controlFocused : undefined,
                      pressed ? styles.togglePressed : undefined,
                    ]}
                  >
                    <Text style={styles.passwordToggleText}>
                      {passwordVisible ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>
                {mode === 'create-account' ? (
                  <Text style={styles.fieldHint}>Usa al menos 8 caracteres.</Text>
                ) : null}
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                  selectable
                  style={styles.errorText}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
              disabled={isSubmitting}
              onBlur={() => setFocusedControl(null)}
              onFocus={() => setFocusedControl('submit')}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.submitButton,
                isSubmitting ? styles.submitButtonDisabled : undefined,
                focusedControl === 'submit' ? styles.controlFocused : undefined,
                pressed && !isSubmitting ? styles.submitButtonPressed : undefined,
              ]}
            >
              {isSubmitting ? <ActivityIndicator color={AUTH_COLORS.surface} size="small" /> : null}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? copy.submitting : copy.submit}
              </Text>
            </Pressable>

            <View style={styles.alternative}>
              <Text style={styles.alternativePrompt}>{copy.alternativePrompt}</Text>
              <Pressable
                accessibilityLabel={copy.alternativeAction}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting }}
                disabled={isSubmitting}
                onBlur={() => setFocusedControl(null)}
                onFocus={() => setFocusedControl('mode-alternative')}
                onPress={switchMode}
                style={({ pressed }) => [
                  styles.alternativeButton,
                  focusedControl === 'mode-alternative' ? styles.controlFocused : undefined,
                  pressed ? styles.togglePressed : undefined,
                ]}
              >
                <Text style={styles.alternativeAction}>{copy.alternativeAction}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: AUTH_COLORS.canvas, flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 32,
    paddingTop: 32,
  },
  scrollContentWide: { alignItems: 'center' },
  layout: { gap: 32, width: '100%' },
  layoutWide: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 72,
    justifyContent: 'space-between',
    maxWidth: 1120,
  },
  brand: { gap: 16 },
  brandWide: { flex: 1, maxWidth: 440 },
  wordmark: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  brandMarkText: { color: AUTH_COLORS.surface, fontSize: 20, fontWeight: '700' },
  wordmarkText: { color: AUTH_COLORS.ink, fontSize: 19, fontWeight: '700', letterSpacing: 0.1 },
  brandHeading: { color: AUTH_COLORS.ink, fontSize: 36, fontWeight: '700', lineHeight: 43 },
  brandDescription: { color: AUTH_COLORS.body, fontSize: 16, lineHeight: 25, maxWidth: 440 },
  brandNote: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 4 },
  brandNoteMark: {
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: 3,
    height: 8,
    width: 8,
  },
  brandNoteText: { color: AUTH_COLORS.muted, fontSize: 14, lineHeight: 20 },
  formCard: {
    backgroundColor: AUTH_COLORS.surface,
    borderColor: AUTH_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 20,
    padding: 24,
    width: '100%',
  },
  formCardWide: { flex: 1, maxWidth: 456 },
  formTitle: { color: AUTH_COLORS.ink, fontSize: 25, fontWeight: '700', lineHeight: 32 },
  formDescription: { color: AUTH_COLORS.body, fontSize: 15, lineHeight: 22, marginTop: -14 },
  modeSwitch: {
    backgroundColor: AUTH_COLORS.segmentSurface,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderWidth: 2,
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  modeButtonSelected: { backgroundColor: AUTH_COLORS.primary },
  modeButtonPressed: { opacity: 0.78 },
  controlFocused: { borderColor: AUTH_COLORS.ink },
  modeButtonText: { color: AUTH_COLORS.body, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  modeButtonTextSelected: { color: AUTH_COLORS.surface },
  fields: { gap: 18 },
  field: { gap: 8 },
  fieldLabel: { color: AUTH_COLORS.ink, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  inputShell: {
    alignItems: 'center',
    backgroundColor: AUTH_COLORS.surface,
    borderColor: AUTH_COLORS.fieldBorder,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputShellFocused: { borderColor: AUTH_COLORS.primary, borderWidth: 2 },
  input: {
    color: AUTH_COLORS.ink,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  passwordToggle: {
    borderColor: 'transparent',
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    marginLeft: 8,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  passwordToggleText: { color: AUTH_COLORS.primary, fontSize: 14, fontWeight: '600' },
  togglePressed: { opacity: 0.7 },
  fieldHint: { color: AUTH_COLORS.muted, fontSize: 13, lineHeight: 18 },
  errorBox: {
    backgroundColor: AUTH_COLORS.errorSurface,
    borderColor: AUTH_COLORS.error,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: AUTH_COLORS.error, fontSize: 14, lineHeight: 20 },
  submitButton: {
    alignItems: 'center',
    backgroundColor: AUTH_COLORS.primary,
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  submitButtonDisabled: { backgroundColor: AUTH_COLORS.disabled },
  submitButtonPressed: { backgroundColor: AUTH_COLORS.primaryPressed },
  submitButtonText: { color: AUTH_COLORS.surface, fontSize: 16, fontWeight: '700' },
  alternative: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  alternativePrompt: { color: AUTH_COLORS.body, fontSize: 14, lineHeight: 20 },
  alternativeButton: {
    borderColor: 'transparent',
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  alternativeAction: { color: AUTH_COLORS.primary, fontSize: 14, fontWeight: '700' },
});
