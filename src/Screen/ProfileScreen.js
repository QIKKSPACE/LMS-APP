import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
  Dimensions,
  Linking,
} from 'react-native';
import { useAuth } from '../Context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
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

// Dynamic icon components
const IconPerson = (props) => <Icon name="person" size={24} color="#dc2626" {...props} />;
const IconEmail = (props) => <Icon name="email" size={24} color="#dc2626" {...props} />;
const IconPhone = (props) => <Icon name="phone" size={24} color="#dc2626" {...props} />;
const IconLocation = (props) => <Icon name="location-on" size={24} color="#dc2626" {...props} />;
const IconEdit = (props) => <Icon name="edit" size={20} color="#6b7280" {...props} />;
const IconSave = (props) => <Icon name="save" size={20} color="#ffffff" {...props} />;
const IconCancel = (props) => <Icon name="close" size={20} color="#374151" {...props} />;
const IconSecurity = (props) => <Icon name="security" size={20} color="#dc2626" {...props} />;
const IconWeb = (props) => <Icon name="language" size={24} color="#dc2626" {...props} />;

const ProfileScreen = () => {
  const { user, updateProfile, logout, sendOTP, loginWithOTP } = useAuth();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    address: ''
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [isSaving, setIsSaving] = useState(false);
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);

  // Phone verification states
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      console.log('Loading user data:', user);
      
      let initialCountryCode = '+91';
      let initialMobileNumber = user.mobileNumber || '';
      
      // Try to extract country code from mobile number if it starts with +
      if (initialMobileNumber.startsWith('+')) {
        const country = countries.find(c => initialMobileNumber.startsWith(c.code));
        if (country) {
          initialCountryCode = country.code;
          initialMobileNumber = initialMobileNumber.slice(country.code.length);
        }
      }

      setEditedData({
        name: user.name || '',
        mobileNumber: initialMobileNumber,
        email: user.email || '',
        address: user.address || ''
      });
      setCountryCode(initialCountryCode);
      setPhoneVerified(user.phoneVerified || false);
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
    setOtpSent(false);
    setOtp('');
  };

  const handleMobileNumberChange = (value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const limitedValue = numericValue.slice(0, 15);

    setEditedData(prev => ({
      ...prev,
      mobileNumber: limitedValue
    }));

    // Reset verification states when number changes
    setOtpSent(false);
    setOtp('');
    setPhoneVerified(false);
  };

  const handleRequestOTP = async () => {
    if (!editedData.mobileNumber || editedData.mobileNumber.length < 7) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid mobile number'
      });
      return;
    }

    const fullPhoneNumber = `${countryCode}${editedData.mobileNumber}`;

    setIsVerifyingPhone(true);
    try {
      const result = await sendOTP(fullPhoneNumber);
      if (result.success) {
        setConfirmation(result.confirmation);
        setOtpSent(true);
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: 'Please enter the code sent to your phone'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to send OTP'
        });
      }
    } catch (error) {
      console.error('Error requesting OTP:', error);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter 6-digit OTP'
      });
      return;
    }

    setIsVerifyingOTP(true);
    try {
      const result = await loginWithOTP(otp, confirmation);
      if (result.success) {
        setPhoneVerified(true);
        Toast.show({
          type: 'success',
          text1: 'Verified',
          text2: 'Phone number verified successfully!'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Invalid OTP'
        });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleSave = async () => {
    if (!editedData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Name is required'
      });
      return;
    }

    const fullPhoneNumber = `${countryCode}${editedData.mobileNumber.trim()}`;
    
    if (fullPhoneNumber !== user.mobileNumber && !phoneVerified && editedData.mobileNumber.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Verification Required',
        text2: 'Please verify your new phone number with OTP first'
      });
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        name: editedData.name.trim(),
        mobileNumber: fullPhoneNumber,
        address: editedData.address.trim(),
        phoneVerified: phoneVerified
      };

      const result = await updateProfile(updates);
      
      if (result && result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully!'
        });
        setIsEditing(false);
      } else {
        const errorMessage = result?.error || 'Failed to update profile';
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: errorMessage
        });
      }
    } catch (error) {
      console.error('Exception during save:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      let initialCountryCode = '+91';
      let initialMobileNumber = user.mobileNumber || '';
      
      if (initialMobileNumber.startsWith('+')) {
        const country = countries.find(c => initialMobileNumber.startsWith(c.code));
        if (country) {
          initialCountryCode = country.code;
          initialMobileNumber = initialMobileNumber.slice(country.code.length);
        }
      }

      setEditedData({
        name: user.name || '',
        mobileNumber: initialMobileNumber,
        email: user.email || '',
        address: user.address || ''
      });
      setCountryCode(initialCountryCode);
      setPhoneVerified(user.phoneVerified || false);
    }
    setIsEditing(false);
    setOtpSent(false);
    setOtp('');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Toast.show({
                type: 'success',
                text1: 'Logged Out',
                text2: 'You have been successfully logged out'
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleChange = (name, value) => {
    setEditedData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenWebsite = async () => {
    try {
      await Linking.openURL('https://brahmadivinegrace.in/');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not open website'
      });
    }
  };

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        setCountryCode(item.code);
        setIsCountryModalVisible(false);
        setPhoneVerified(false);
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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your profile information</Text>
          </View>
          {!isEditing && (
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.editButton}
              activeOpacity={0.8}
            >
              <IconEdit />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.privacyNotice}>
          <IconSecurity />
          <Text style={styles.privacyText}>
            <Text style={styles.privacyTextBold}>Privacy Notice: </Text>
            Your personal information is protected and confidential.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={require('../assets/Logo1.jpeg')}
                style={styles.avatar}
                resizeMode="contain"
              />
            </View>
            {!isEditing ? (
              <Text style={styles.userName}>{editedData.name || 'User'}</Text>
            ) : (
              <TextInput
                value={editedData.name}
                onChangeText={(value) => handleChange('name', value)}
                style={styles.userNameInput}
                placeholder="Enter name"
                placeholderTextColor="#9ca3af"
                textAlign="center"
              />
            )}
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <IconPerson />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                {isEditing ? (
                  <TextInput
                    value={editedData.name}
                    onChangeText={(value) => handleChange('name', value)}
                    style={styles.infoInput}
                    placeholder="Enter your name"
                    placeholderTextColor="#9ca3af"
                  />
                ) : (
                  <Text style={styles.infoValue}>
                    {editedData.name || 'Not provided'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <IconEmail />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{editedData.email}</Text>
                {isEditing && (
                  <Text style={styles.infoHint}>Email cannot be changed</Text>
                )}
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <IconPhone />
              </View>
              <View style={styles.infoContent}>
                <View style={styles.labelWithBadge}>
                  <Text style={styles.infoLabel}>Mobile Number</Text>
                  {phoneVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>

                {isEditing ? (
                  <View style={styles.phoneInputSection}>
                    <View style={styles.phoneInputContainer}>
                      <View style={styles.countryPicker}>
                        <TextInput
                          style={styles.countryCodeInput}
                          value={countryCode}
                          onChangeText={(text) => {
                            if (text === '' || (text.startsWith('+') && !isNaN(text.slice(1)))) {
                              setCountryCode(text.slice(0, 5));
                              setPhoneVerified(false);
                            }
                          }}
                          keyboardType="phone-pad"
                        />
                        <TouchableOpacity onPress={() => setIsCountryModalVisible(true)}>
                          <Ionicons name="chevron-down" size={14} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        value={editedData.mobileNumber}
                        onChangeText={handleMobileNumberChange}
                        style={styles.mobileInput}
                        placeholder="Mobile number"
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                        maxLength={15}
                      />
                    </View>

                    {!phoneVerified && editedData.mobileNumber.length >= 7 && !otpSent && (
                      <TouchableOpacity
                        onPress={handleRequestOTP}
                        disabled={isVerifyingPhone}
                        style={styles.verificationButton}
                      >
                        {isVerifyingPhone ? (
                          <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                          <Text style={styles.verificationButtonText}>Verify Number</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {otpSent && !phoneVerified && (
                      <View style={styles.otpSection}>
                        <Text style={styles.otpHint}>OTP sent to {countryCode} {editedData.mobileNumber}</Text>
                        <View style={styles.otpInputRow}>
                          <TextInput
                            value={otp}
                            onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, '').slice(0, 6))}
                            style={styles.otpInput}
                            placeholder="000000"
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                          <TouchableOpacity
                            onPress={handleVerifyOTP}
                            disabled={isVerifyingOTP || otp.length !== 6}
                            style={styles.otpVerifyButton}
                          >
                            {isVerifyingOTP ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text style={styles.otpVerifyButtonText}>Verify</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={handleRequestOTP} style={styles.resendButton}>
                          <Text style={styles.resendButtonText}>Resend OTP</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.infoValue}>
                    {user.mobileNumber || 'Not provided'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <IconLocation />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                {isEditing ? (
                  <TextInput
                    value={editedData.address}
                    onChangeText={(value) => handleChange('address', value)}
                    style={[styles.infoInput, styles.textArea]}
                    placeholder="Enter your address"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={styles.infoValue}>
                    {editedData.address || 'Not provided'}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isSaving}
                style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
                activeOpacity={0.8}
              >
                <IconCancel />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <IconSave />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.logoutSection}>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              activeOpacity={0.8}
            >
              <Icon name="logout" size={20} color="#dc2626" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Separated Website Link Card */}
        <TouchableOpacity 
          style={styles.externalLinkCard} 
          onPress={handleOpenWebsite}
          activeOpacity={0.7}
        >
          <View style={styles.externalLinkIcon}>
            <IconWeb size={28} />
          </View>
          <View style={styles.externalLinkContent}>
            <Text style={styles.externalLinkLabel}>Check out our web version</Text>
            <Text style={styles.externalLinkValue}>Visit brahmadivinegrace.in</Text>
          </View>
          <Icon name="open-in-new" size={24} color="#9ca3af" />
        </TouchableOpacity>

      </ScrollView>

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
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    marginLeft: 8,
  },
  privacyTextBold: {
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userNameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#dc2626',
    paddingVertical: 4,
    minWidth: 200,
  },
  infoSection: {
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  infoIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  infoInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
  },
  infoHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  phoneInputSection: {
    gap: 10,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 85,
  },
  countryCodeInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  mobileInput: {
    flex: 1,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  verificationButton: {
    paddingVertical: 4,
  },
  verificationButtonText: {
    color: '#dc2626',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  otpSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  otpHint: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 8,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: 'bold',
  },
  otpVerifyButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  otpVerifyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resendButton: {
    marginTop: 8,
  },
  resendButtonText: {
    fontSize: 12,
    color: '#2563eb',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  logoutSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  countryList: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
  },
  externalLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  externalLinkIcon: {
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 50,
    marginRight: 16,
  },
  externalLinkContent: {
    flex: 1,
  },
  externalLinkLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  externalLinkValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
});

export default ProfileScreen;