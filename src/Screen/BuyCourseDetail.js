    /**
 * BuyCourseDetailScreen Component - React Native CLI
 * 
 * Dynamic course detail screen with banner, details, price, and Buy Now button
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {getCourseById, enrollInCourse} from '../Services/courseService';
import {useAuth} from '../Context/AuthContext';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const {width, height} = Dimensions.get('window');

const BuyCourseDetailScreen = ({route, navigation}) => {
  const {courseId, onPurchase} = route.params || {};
  const {user} = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Fetch course from Firestore
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseById(courseId);

        if (courseData) {
          setCourse(courseData);
        } else {
          console.error('Course not found in Firestore');
          Toast.show({
            type: 'error',
            text1: 'Course not found',
          });
        }
      } catch (error) {
        console.error('Error fetching course:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to load course',
        });
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const handleBuyNow = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Please login to purchase this course',
      });
      return;
    }

    if (purchasing) return;

    Alert.alert(
      'Confirm Purchase',
      `Are you sure you want to purchase "${course.title}" for ₹${course.price}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Buy Now',
          onPress: async () => {
            try {
              setPurchasing(true);

              // Set expiry date (1 year from now)
              const expiryDate = new Date();
              expiryDate.setFullYear(expiryDate.getFullYear() + 1);
              const expiryDateStr = expiryDate.toISOString().split('T')[0];

              // Enroll user in course
              const result = await enrollInCourse(
                user.uid,
                courseId,
                expiryDateStr,
              );

              if (result.success) {
                Toast.show({
                  type: 'success',
                  text1: '🎉 Course purchased successfully!',
                });

                // Wait a bit for user to see the success message
                setTimeout(() => {
                  if (onPurchase) {
                    onPurchase(courseId);
                  }
                  navigation.goBack();
                }, 1500);
              } else {
                Toast.show({
                  type: 'error',
                  text1: result.error || 'Failed to purchase course',
                });
              }
            } catch (error) {
              console.error('Purchase error:', error);
              Toast.show({
                type: 'error',
                text1: 'An error occurred during purchase',
              });
            } finally {
              setPurchasing(false);
            }
          },
        },
      ],
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  // Course not found
  if (!course) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <MaterialCommunityIcons
              name="close-circle"
              size={48}
              color="#DC2626"
            />
          </View>
          <Text style={styles.errorTitle}>Course Not Found</Text>
          <Text style={styles.errorDescription}>
            The course you're looking for doesn't exist.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backIconButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* Course Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{uri: course.thumbnail}}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={styles.bannerGradient}
          />
          <View style={styles.bannerContent}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            {course.membershipType && (
              <View style={styles.membershipBadge}>
                <Text style={styles.membershipText}>
                  {course.membershipType}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Course Details Section */}
        <View style={styles.detailsContainer}>
          {/* Course Description */}
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>About This Course</Text>

            {/* Description - Note: React Native doesn't support dangerouslySetInnerHTML */}
            <Text style={styles.descriptionText}>{course.description}</Text>

            {/* Course Info */}
            <View style={styles.courseInfoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <MaterialCommunityIcons
                      name="book-open-variant"
                      size={24}
                      color="#DC2626"
                    />
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Total Chapters</Text>
                    <Text style={styles.infoValue}>{course.chapters} Chapters</Text>
                  </View>
                </View>

                {course.sections && course.sections.length > 0 && (
                  <View style={styles.infoItem}>
                    <View style={[styles.infoIconContainer, styles.blueIcon]}>
                      <MaterialCommunityIcons
                        name="play-circle"
                        size={24}
                        color="#3B82F6"
                      />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Total Lectures</Text>
                      <Text style={styles.infoValue}>
                        {course.sections.reduce(
                          (sum, section) => sum + (section.lectures || 0),
                          0,
                        )}{' '}
                        Lectures
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.learningTitle}>What you'll learn:</Text>
              <View style={styles.learningList}>
                {[
                  'Comprehensive understanding of core concepts',
                  'Practical skills and real-world applications',
                  'Expert guidance and support',
                  'Access to all course materials and resources',
                ].map((item, index) => (
                  <View key={index} style={styles.learningItem}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color="#DC2626"
                      style={styles.checkmarkIcon}
                    />
                    <Text style={styles.learningText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Purchase Section */}
          {!course.isPurchased && (
            <View style={styles.purchaseCard}>
              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Total Price</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{course.price}</Text>
                  {course.discount > 0 && (
                    <View style={styles.discountContainer}>
                      <Text style={styles.originalPrice}>
                        ₹{Math.round(course.price / (1 - course.discount / 100))}
                      </Text>
                      <Text style={styles.discountText}>
                        Save {course.discount}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.buyButton,
                  purchasing && styles.buyButtonDisabled,
                ]}
                onPress={handleBuyNow}
                disabled={purchasing}>
                <LinearGradient
                  colors={['#DC2626', '#B91C1C']}
                  style={styles.buyButtonGradient}>
                  {purchasing ? (
                    <>
                      <ActivityIndicator color="#FFF" size="small" />
                      <Text style={styles.buyButtonText}>Processing...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="cart"
                        size={20}
                        color="#FFF"
                        style={styles.cartIcon}
                      />
                      <Text style={styles.buyButtonText}>Buy Now</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Already Purchased Message */}
          {course.isPurchased && (
            <View style={styles.purchasedCard}>
              <View style={styles.purchasedIconContainer}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={32}
                  color="#FFF"
                />
              </View>
              <View style={styles.purchasedTextContainer}>
                <Text style={styles.purchasedTitle}>You own this course</Text>
                <Text style={styles.purchasedDescription}>
                  Access all content in My Courses
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#FEE2E2',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backIconButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#374151',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  bannerContainer: {
    width: width,
    height: height * 0.35,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  courseTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 10,
  },
  membershipBadge: {
    backgroundColor: '#DC2626',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  membershipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 16,
  },
  descriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  courseInfoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#FEE2E2',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blueIcon: {
    backgroundColor: '#DBEAFE',
  },
  checkmarkIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  learningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  learningList: {
    gap: 12,
  },
  learningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
    learningText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  purchaseCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  priceSection: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  discountContainer: {
    gap: 2,
  },
  originalPrice: {
    fontSize: 12,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  buyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButtonDisabled: {
    opacity: 0.5,
  },
  buyButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
    buyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  purchasedCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  purchasedIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  purchasedIcon: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
  },
  purchasedTextContainer: {
    flex: 1,
  },
  purchasedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064E3B',
  },
  purchasedDescription: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
    marginTop: 4,
  },
});

export default BuyCourseDetailScreen;