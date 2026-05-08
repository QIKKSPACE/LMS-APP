import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../Context/AuthContext';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const countries = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
];

const AuthScreen = () => {
  // Steps: 0 = Mobile, 1 = OTP
  const [step, setStep] = useState(0);
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);

  const { sendOTP, loginWithOTP } = useAuth();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleMobileChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 15);
    setMobileNumber(cleaned);
    if (error) setError('');
  };

  const handleOtpChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    if (error) setError('');
  };

  const handleRequestOTP = async () => {
    if (!mobileNumber || mobileNumber.length < 7) {
      setError('Please enter a valid mobile number');
      return;
    }

    const fullPhoneNumber = `${countryCode}${mobileNumber}`;

    setIsLoading(true);
    try {
      const result = await sendOTP(fullPhoneNumber);
      if (result.success) {
        setConfirmation(result.confirmation);
        setStep(1);
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: 'Verification code sent to ' + countryCode + ' ' + mobileNumber,
        });
      } else {
        setError(result.error || 'Failed to send OTP');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to send OTP',
        });
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithOTP(otp, confirmation);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Welcome',
          text2: 'Logged in successfully!',
        });
      } else {
        setError(result.error || 'Invalid OTP');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Invalid OTP',
        });
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep(0);
    setOtp('');
    setError('');
  };

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        setCountryCode(item.code);
        setIsCountryModalVisible(false);
      }}
    >
      <View style={styles.countryItemLeft}>
        <Text style={styles.countryFlag}>{item.flag}</Text>
        <Text style={styles.countryName}>{item.name}</Text>
      </View>
      <Text style={styles.countryCodeText}>{item.code}</Text>
      {countryCode === item.code && (
        <Ionicons name="checkmark-circle" size={20} color="#dc2626" style={{marginLeft: 10}} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fff5f5', '#ffffff', '#fff5f5']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.header}>
                <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.logoRing}>
                    <Image
                      source={require('../assets/Logo1.jpeg')}
                      style={styles.logo}
                      resizeMode="cover"
                    />
                  </View>
                </Animated.View>
                <Text style={styles.title}>
                  {step === 0 ? 'Welcome' : 'Verify OTP'}
                </Text>
                <Text style={styles.subtitle}>
                  {step === 0
                    ? 'Sign in or Sign up with your mobile number'
                    : `Enter the 6-digit code sent to ${countryCode} ${mobileNumber}`}
                </Text>
              </View>

              <View style={styles.card}>
                {step === 0 ? (
                  <View>
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
                      <View style={styles.prefixContainer}>
                        <TextInput
                          style={styles.prefixInput}
                          value={countryCode}
                          onChangeText={(text) => {
                            if (text === '' || (text.startsWith('+') && !isNaN(text.slice(1)))) {
                              setCountryCode(text.slice(0, 5));
                            }
                          }}
                          keyboardType="phone-pad"
                          placeholder="+91"
                        />
                        <TouchableOpacity 
                          onPress={() => setIsCountryModalVisible(true)}
                          style={styles.chevronButton}
                        >
                          <Ionicons name="chevron-down" size={14} color="#9ca3af" />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="9999999999"
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                        value={mobileNumber}
                        onChangeText={handleMobileChange}
                        maxLength={15}
                      />
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                      onPress={handleRequestOTP}
                      disabled={isLoading || mobileNumber.length < 7}
                      style={[
                        styles.mainButton,
                        (isLoading || mobileNumber.length < 7) && styles.buttonDisabled,
                      ]}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#dc2626', '#f43f5e']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.buttonText}>Send OTP</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <TouchableOpacity onPress={goBack} style={styles.backButton}>
                      <Text style={styles.backButtonText}>← Edit Number</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Enter OTP</Text>
                    <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
                      <TextInput
                        style={[styles.input, styles.otpInput]}
                        placeholder="000000"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        value={otp}
                        onChangeText={handleOtpChange}
                        maxLength={6}
                        letterSpacing={10}
                      />
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                      onPress={handleVerifyOTP}
                      disabled={isLoading || otp.length !== 6}
                      style={[
                        styles.mainButton,
                        (isLoading || otp.length !== 6) && styles.buttonDisabled,
                      ]}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#dc2626', '#f43f5e']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.buttonText}>Verify & Continue</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.resendContainer}>
                      <Text style={styles.resendText}>Didn't receive code? </Text>
                      <TouchableOpacity onPress={handleRequestOTP} disabled={isLoading}>
                        <Text style={styles.resendLink}>Resend OTP</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.footer}>
                By continuing, you agree to our{' '}
                <Text style={styles.footerLink}>Terms</Text> and{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Country Selection Modal */}
      <Modal
        visible={isCountryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setIsCountryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countries}
              keyExtractor={(item) => item.code + item.name}
              renderItem={renderCountryItem}
              contentContainerStyle={styles.countryList}
            />
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#dc2626',
    padding: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    height: 56,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  prefixInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    width: 45,
    textAlign: 'center',
    padding: 0,
  },
  chevronButton: {
    padding: 2,
  },
  divider: {
    height: 24,
    width: 1,
    backgroundColor: '#d1d5db',
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingLeft: 8,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  mainButton: {
    marginTop: 24,
    borderRadius: 5, // Requirement: 5px border radius
    overflow: 'hidden',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  resendLink: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
  },
  footerLink: {
    color: '#dc2626',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.7,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  countryList: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
  },
});

export default AuthScreen;