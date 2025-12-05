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
} from 'react-native';
import { useAuth } from '../Context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Dynamic icon components
const IconPerson = (props) => <Icon name="person" size={24} color="#dc2626" {...props} />;
const IconEmail = (props) => <Icon name="email" size={24} color="#dc2626" {...props} />;
const IconPhone = (props) => <Icon name="phone" size={24} color="#dc2626" {...props} />;
const IconLocation = (props) => <Icon name="location-on" size={24} color="#dc2626" {...props} />;
const IconEdit = (props) => <Icon name="edit" size={20} color="#6b7280" {...props} />;
const IconSave = (props) => <Icon name="save" size={20} color="#ffffff" {...props} />;
const IconCancel = (props) => <Icon name="close" size={20} color="#374151" {...props} />;
const IconSecurity = (props) => <Icon name="security" size={20} color="#dc2626" {...props} />;
const IconSettings = (props) => <Icon name="settings" size={20} color="#6b7280" {...props} />;
const IconNotifications = (props) => <Icon name="notifications" size={20} color="#6b7280" {...props} />;
const IconLanguage = (props) => <Icon name="language" size={20} color="#6b7280" {...props} />;
const IconTheme = (props) => <Icon name="palette" size={20} color="#6b7280" {...props} />;

const ProfileScreen = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    address: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      console.log('Loading user data:', user);
      setEditedData({
        name: user.name || '',
        mobileNumber: user.mobileNumber || '',
        email: user.email || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    console.log('Attempting to save profile:', editedData);
    
    // Validation
    if (!editedData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Name is required'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Only send fields that can be updated (exclude email and uid)
      const updates = {
        name: editedData.name.trim(),
        mobileNumber: editedData.mobileNumber.trim(),
        address: editedData.address.trim()
      };

      console.log('Sending updates:', updates);

      const result = await updateProfile(updates);
      
      console.log('Update result:', result);

      if (result && result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully!'
        });
        setIsEditing(false);
      } else {
        const errorMessage = result?.error || 'Failed to update profile';
        console.error('Update failed:', errorMessage);
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
    // Reset to original user data
    if (user) {
      setEditedData({
        name: user.name || '',
        mobileNumber: user.mobileNumber || '',
        email: user.email || '',
        address: user.address || ''
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
              // Navigation to AuthScreen will happen automatically due to auth state change
            } catch (error) {
              console.error('Logout error:', error);
              Toast.show({
                type: 'error',
                text1: 'Logout Failed',
                text2: 'Failed to logout. Please try again.'
              });
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
      {/* Header */}
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
      >
        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <IconSecurity />
          <Text style={styles.privacyText}>
            <Text style={styles.privacyTextBold}>Privacy Notice: </Text>
            Your personal information is protected and confidential.
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Profile Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={require('../assets/logo.png')}
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

          {/* Profile Information */}
          <View style={styles.infoSection}>
            {/* Name */}
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

            {/* Email */}
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

            {/* Mobile Number */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <IconPhone />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Mobile Number</Text>
                {isEditing ? (
                  <TextInput
                    value={editedData.mobileNumber}
                    onChangeText={(value) => handleChange('mobileNumber', value)}
                    style={styles.infoInput}
                    placeholder="Enter your mobile number"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.infoValue}>
                    {editedData.mobileNumber || 'Not provided'}
                  </Text>
                )}
              </View>
            </View>

            {/* Address */}
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

          {/* Edit Actions */}
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

          {/* Logout Button - Always Visible */}
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
      </ScrollView>

      {/* Toast Component */}
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
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    paddingTop:34
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
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
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
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
    color: '#1f2937',
    borderBottomWidth: 2,
    borderBottomColor: '#dc2626',
    paddingVertical: 4,
    paddingHorizontal: 12,
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
  iconText: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  infoInput: {
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
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
  logoutSection: {
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
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ProfileScreen;