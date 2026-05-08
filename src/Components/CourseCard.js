// src/Components/CourseCard.js
import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ProgressBar from './Progressbar';

const { width } = Dimensions.get('window');

/**
 * ✅ PREMIUM MODERIZED COURSECARD
 * Features:
 * - NaN-safe date handling
 * - Instructor Avatar overlay (Web-aligned premium branding)
 * - Split title banner (Native pattern)
 * - Multi-state UI (Purchased, Expired, Storefront)
 */
const CourseCard = memo(({
  courseId,
  title,
  courseTitle,
  courseName,
  membershipType,
  thumbnail,
  courseThumbnail,
  thumbnailUrl,
  imageUrl,
  instructorImage,
  status,
  progress,
  chapters,
  isPurchased,
  price,
  showStatus = true,
  expiryDate,
  validityMonths,
  enrolledStatus,
  isExpired: propIsExpired,
  onCourseClick,
  onBuyClick,
  navigation,
}) => {
  const displayTitle = courseTitle || title || courseName || 'Untitled Course';
  const displayThumbnail = courseThumbnail || thumbnail || thumbnailUrl || imageUrl;
  
  // ✅ FIXED: Safe date calculation
  const getDaysUntilExpiry = useCallback((expiryDateStr) => {
    if (!expiryDateStr) return null;
    try {
      const expiry = new Date(expiryDateStr);
      if (isNaN(expiry.getTime())) return null;
      const now = new Date();
      expiry.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } catch (e) { return null; }
  }, []);

  const formatExpiryDate = useCallback((expiryDateStr) => {
    if (!expiryDateStr) return 'No expiry';
    try {
      const date = new Date(expiryDateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) { return 'Invalid date'; }
  }, []);

  const daysLeft = getDaysUntilExpiry(expiryDate);
  const isExpired = propIsExpired || enrolledStatus === 'expired' || (daysLeft !== null && daysLeft < 0);

  // ✅ NATIVE PATTERN: Split Title
  const titleWords = displayTitle.split(' ');
  const titleMain = titleWords.slice(0, -1).join(' ');
  const titleSub = titleWords.slice(-1)[0];

  const handlePress = () => {
    if (isExpired) return;
    if (onCourseClick) onCourseClick(courseId);
    if (navigation) {
      isPurchased ? navigation.navigate('VideoPlayer', { courseId }) : navigation.navigate('BuyCourseDetail', { courseId });
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={isExpired ? 1 : 0.85} style={styles.card}>
      {/* Thumbnail & Avatar Section */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: displayThumbnail || 'https://via.placeholder.com/600x400' }} 
          style={styles.image} 
          resizeMode="cover" 
        />
        
        {/* Overlay Content: Avatar & Split Title */}
        <View style={styles.overlayContent}>
          {instructorImage && (
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarBorder} />
              <Image source={{ uri: instructorImage }} style={styles.avatar} />
            </View>
          )}
        </View>

        {isExpired && (
          <View style={styles.expiredLock}>
            <MaterialCommunityIcons name="lock-outline" size={48} color="#fff" />
            <Text style={styles.lockText}>Expired</Text>
          </View>
        )}
      </View>

      {/* Details Section */}
      <View style={styles.details}>
        <Text style={styles.realTitle} numberOfLines={1}>{displayTitle}</Text>

        {!isPurchased && !isExpired && price !== undefined && (
            <View style={styles.priceRowUnderTitle}>
              <Text style={styles.priceCurrency}>₹</Text>
              <Text style={styles.priceValue}>{price}</Text>
            </View>
        )}

        {/* Expiry / Progress */}
        {isPurchased && !isExpired && (
          <View style={styles.purchasedInfo}>
            {expiryDate && (
              <View style={[styles.expiryBadge, { backgroundColor: daysLeft <= 7 ? '#fffbeb' : '#eff6ff' }]}>
                <MaterialCommunityIcons name="calendar-clock" size={14} color={daysLeft <= 7 ? '#f59e0b' : '#3b82f6'} />
                <Text style={[styles.expiryText, { color: daysLeft <= 7 ? '#b45309' : '#1e40af' }]}>
                  {daysLeft <= 7 ? `Expires in ${daysLeft} days` : `Valid until ${formatExpiryDate(expiryDate)}`}
                </Text>
              </View>
            )}
            <View style={styles.progressRow}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelText}>PROGRESS</Text>
                <Text style={styles.progressValueText}>{Math.round(progress || 0)}%</Text>
              </View>
              <ProgressBar progress={progress || 0} height={6} />
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity style={styles.btn} onPress={isPurchased ? handlePress : (onBuyClick ? () => onBuyClick(courseId) : handlePress)}>
          <LinearGradient 
            colors={isPurchased ? (isExpired ? ['#9ca3af', '#6b7280'] : ['#3b82f6', '#1d4ed8']) : ['#dc2626', '#991b1b']} 
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>
              {isExpired ? 'Contact Support' : isPurchased ? (progress > 0 ? 'Continue' : 'Start') : 'Buy Now'}
            </Text>
            <MaterialCommunityIcons name={isPurchased ? "play" : "cart"} size={16} color="#fff" style={{ marginLeft: 6 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6' },
  imageContainer: { height: 200, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  overlayContent: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 16 },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatarBorder: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 50, borderWidth: 3, borderColor: '#DC2626', opacity: 0.8 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fff' },
  titleOverlay: { alignItems: 'center' },
  titleMainText: { color: '#fff', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  titleSubText: { color: '#fff', fontSize: 13, textTransform: 'uppercase', opacity: 0.9, letterSpacing: 2 },
  expiredLock: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  lockText: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 8 },
  priceTag: { position: 'absolute', top: 12, right: 12, backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  priceTagText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  details: { padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  membershipBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6 },
  membershipText: { color: '#991b1b', fontSize: 10, fontWeight: '800' },
  metaIcon: { fontSize: 12 },
  realTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  purchasedInfo: { marginBottom: 16 },
  expiryBadge: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  expiryText: { fontSize: 11, fontWeight: '700', marginLeft: 6 },
  progressRow: { marginTop: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabelText: { fontSize: 9, fontWeight: '900', color: '#6b7280' },
  progressValueText: { fontSize: 12, fontWeight: '900', color: '#DC2626' },
  btn: { borderRadius: 12, overflow: 'hidden' },
  btnGradient: { height: 46, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  priceRowUnderTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  priceCurrency: { fontSize: 18, fontWeight: '900', color: '#DC2626', marginRight: 2 },
  priceValue: { fontSize: 24, fontWeight: '900', color: '#111827' },
});

export default CourseCard;