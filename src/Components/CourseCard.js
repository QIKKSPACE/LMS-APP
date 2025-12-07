import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ProgressBar from './Progressbar';
import { formatExpiryDate, getDaysUntilExpiry } from '../unities/courseExpiry';
import { initiateRazorpayPayment } from '../Services/razorpayServiceReactNative';
import Toast from 'react-native-toast-message';
import { useAuth } from '../Context/AuthContext';
const { width } = Dimensions.get('window');

const CourseCard = memo(
  ({
    courseId,
    title,
    membershipType,
    thumbnail,
    status,
    progress,
    chapters,
    isPurchased,
    price,
    showStatus = true,
    expiryDate,
    onCourseClick,
    navigation,
    description
  }) => {
    const {user} = useAuth()
    const handleCardPress = useCallback(() => {
      if (onCourseClick) {
        onCourseClick(courseId);
      }
      if (navigation) {
        if (isPurchased) {
          // Navigate to VideoPlayer for purchased courses
          navigation.navigate('VideoPlayer', { courseId });
        } else {
          // Navigate to BuyCourseDetail for unpurchased courses
          navigation.navigate('BuyCourseDetail', { courseId });
        }
      }
    }, [courseId, onCourseClick, navigation, isPurchased]);
  const handleBuyNow = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Please login to purchase this course',
      });
      return;
    }

    // if (purchasing) return;

    Alert.alert(
      'Confirm Purchase',
      `Are you sure you want to purchase "${title}" for ₹${price}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Proceed to Payment',
          onPress: async () => {
            try {
              // setPurchasing(true);

              console.log('🚀 Initiating payment for course:', title);

              // Prepare course data for Razorpay
              const courseData = {
                id: courseId,
                title: title,
                price: price,
                description:description,
                thumbnail: thumbnail,
              };

              // Prepare user data for Razorpay
              const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.name,
                phoneNumber: user.phoneNumber,
              };

              // Initiate Razorpay payment
              const paymentResult = await initiateRazorpayPayment(
                courseData,
                userData,
                (result) => {
                  // Callback after successful payment
                  console.log('✅ Payment callback received:', result);
                }
              );

              console.log('💰 Payment successful:', paymentResult);

              Toast.show({
                type: 'success',
                text1: '🎉 Payment successful!',
                text2: 'Course added to your library',
              });

              // Wait a bit for user to see the success message
              setTimeout(() => {
                // if (onPurchase) {
                //   onPurchase(courseId);
                // }
                // Navigate to MyCourse tab after purchase
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp' }],
                });

                // Navigate to MyCourse tab after a short delay to ensure MainApp loads
                setTimeout(() => {
                  Alert.alert("Purchase Successful", "You have successfully purchased the course.");
                  navigation.navigate('MainApp', {
                    screen: 'Mycourse',
                    params: { refresh: true } // Add refresh param to trigger course refresh
                  });
                },);
              }, 1000);

            } catch (error) {
              console.error('💳 Payment error:', error);

              let errorMessage = 'Payment failed';
              if (error.message.includes('cancelled')) {
                errorMessage = 'Payment was cancelled';
              } else if (error.message.includes('Payment gateway not configured')) {
                errorMessage = 'Payment service not available. Please contact support.';
              } else {
                errorMessage = error.message || 'An error occurred during payment';
              }

              Toast.show({
                type: 'error',
                text1: 'Payment Failed',
                text2: errorMessage,
              });
            } finally {
              // setPurchasing(false);
            }
          },
        },
      ],
    );
  };

  const handleContinueLearning = () => {
    if (navigation) {
      navigation.navigate('VideoPlayer', { courseId });
    }
  };

    const getStatusColor = useCallback((stat) => {
      switch (stat) {
        case 'COMPLETED':
          return ['#10b981', '#059669'];
        case 'IN_PROGRESS':
          return ['#3b82f6', '#4f46e5'];
        case 'EXPIRED':
          return ['#ef4444', '#f43f5e'];
        case 'PAID':
          return ['#a855f7', '#ec4899'];
        default:
          return ['#6b7280', '#475569'];
      }
    }, []);

    const getStatusBadgeColor = useCallback((stat) => {
      if (stat === 'EXPIRED') return styles.statusBadgeRed;
      if (stat === 'COMPLETED') return styles.statusBadgeGreen;
      if (stat === 'IN_PROGRESS') return styles.statusBadgeBlue;
      if (stat === 'PAID') return styles.statusBadgePurple;
      return styles.statusBadgeGray;
    }, []);

    const daysLeft = expiryDate ? getDaysUntilExpiry(expiryDate) : null;
    const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
    const isExpired = status === 'EXPIRED' || (daysLeft !== null && daysLeft < 0);

    const getExpiryText = useCallback(() => {
      if (isExpired) {
        return `Expired on ${formatExpiryDate(expiryDate)}`;
      }
      if (daysLeft === 0) return '⚠️ Expires today!';
      if (daysLeft && daysLeft > 0 && daysLeft <= 7) {
        return `⏰ ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining`;
      }
      return `Valid until ${formatExpiryDate(expiryDate)}`;
    }, [daysLeft, isExpired, expiryDate]);

    const getExpiryBgColor = useCallback(() => {
      if (isExpired) return styles.expiryBgRed;
      if (isExpiringSoon) return styles.expiryBgAmber;
      return styles.expiryBgBlue;
    }, [isExpired, isExpiringSoon]);

    const getExpiryIconColor = useCallback(() => {
      if (isExpired) return '#dc2626';
      if (isExpiringSoon) return '#f59e0b';
      return '#3b82f6';
    }, [isExpired, isExpiringSoon]);

    return (
      <TouchableOpacity
        onPress={handleCardPress}
        activeOpacity={0.85}
        style={styles.cardContainer}
      >
        {/* Thumbnail Section */}
        <View style={styles.thumbnailContainer}>
          <ImageBackground
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          >
            {/* Gradient Overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientOverlay}
            />

            {/* New Badge */}
            {!isPurchased && (
              <LinearGradient
                colors={['#fbbf24', '#f97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newBadge}
              >
                <MaterialCommunityIcons
                  name="star"
                  size={14}
                  color="#fff"
                />
                <Text style={styles.newBadgeText}>New</Text>
              </LinearGradient>
            )}

            {/* Chapters Badge */}
            <View style={styles.chaptersBadge}>
              <Text style={styles.chaptersBadgeText}>
                📚 {chapters} Chapters
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Membership Badge */}
          <View style={styles.badgesRow}>
            <LinearGradient
              colors={['#fee2e2', '#fecaca']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.membershipBadge}
            >
              <Text style={styles.membershipBadgeText}>
                {membershipType}
              </Text>
            </LinearGradient>

            {isPurchased && progress > 0 && progress < 100 && (
              <LinearGradient
                colors={['#dbeafe', '#bfdbfe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inProgressBadge}
              >
                <MaterialCommunityIcons
                  name="trending-up"
                  size={12}
                  color="#1d4ed8"
                />
                <Text style={styles.inProgressBadgeText}>In Progress</Text>
              </LinearGradient>
            )}
          </View>

          {/* Title and Status */}
          <View style={styles.titleContainer}>
            <Text
              style={styles.courseTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {showStatus && (
              <LinearGradient
                colors={getStatusColor(status)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={getStatusBadgeColor(status)}
              >
                <Text style={styles.statusBadgeText}>{status}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Progress Section */}
          {isPurchased && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarContainer}>
                <ProgressBar progress={progress} height={10} />
                {progress !== undefined && (
                  <LinearGradient
                    colors={['#dc2626', '#f43f5e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.progressPercentage}
                  >
                    <Text style={styles.progressPercentageText}>
                      {Math.floor(progress)}%
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <Text style={styles.progressText}>
                {progress === 100
                  ? 'Course Completed! 🎉'
                  : `${Math.floor(progress)}% completed - Keep going!`}
              </Text>
            </View>
          )}

          {/* Expiry Information */}
          {isPurchased && expiryDate && status !== 'COMPLETED' && (
            <View style={[styles.expiryContainer, getExpiryBgColor()]}>
              <MaterialCommunityIcons
                name="calendar"
                size={18}
                color={getExpiryIconColor()}
              />
              <Text
                style={[
                  styles.expiryText,
                  isExpired && styles.expiryTextRed,
                  isExpiringSoon && !isExpired && styles.expiryTextAmber,
                  !isExpired && !isExpiringSoon && styles.expiryTextBlue,
                ]}
              >
                {getExpiryText()}
              </Text>
            </View>
          )}

          {/* Debug: Log Continue Learning button conditions */}
          {(() => {
            console.log(`🔍 Continue Learning conditions for: ${title}`);
            console.log(`  - isPurchased: ${isPurchased}`);
            console.log(`  - progress: ${progress}%`);
            console.log(`  - should show: ${isPurchased && progress > 0 && progress < 100}`);
            return null;
          })()}

          {/* Continue Learning Button */}
          {/* TEMP: Show for any purchased course to test visibility */}
          {isPurchased && (
            <TouchableOpacity
              onPress={handleContinueLearning}
              activeOpacity={0.8}
              style={styles.continueLearningSection}
            >
              <LinearGradient
                colors={['#10b981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueLearningButton}
              >
                <MaterialCommunityIcons
                  name="play-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.continueLearningButtonText}>Continue Learning</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={16}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Buy Button */}
          {!isPurchased && (
            <View style={styles.buySection}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price</Text>
                <Text style={styles.priceValue}>₹{price}</Text>
              </View>
              <TouchableOpacity
                onPress={handleBuyNow}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#dc2626', '#f43f5e', '#be123c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buyButton}
                >
                  <MaterialCommunityIcons
                    name="shopping-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.buyButtonText}>Buy Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

CourseCard.displayName = 'CourseCard';

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },

  // Thumbnail Section
  thumbnailContainer: {
    height: 200,
    overflow: 'hidden',
  },
  thumbnail: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Badges
  newBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  chaptersBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chaptersBadgeText: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '700',
  },

  // Content Section
  contentContainer: {
    padding: 20,
  },

  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },

  membershipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  membershipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
  },

  inProgressBadge: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  inProgressBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },

  // Title and Status
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  courseTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 24,
  },

  statusBadgeRed: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeGreen: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeBlue: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgePurple: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeGray: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Progress Section
  progressSection: {
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressPercentage: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressPercentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Expiry Section
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  expiryBgRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  expiryBgAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  expiryBgBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  expiryTextRed: {
    color: '#b91c1c',
  },
  expiryTextAmber: {
    color: '#b45309',
  },
  expiryTextBlue: {
    color: '#1e40af',
  },

  // Buy Section
  buySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Continue Learning Section
  continueLearningSection: {
    marginTop: 12,
  },
  continueLearningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueLearningButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
});

export default CourseCard;