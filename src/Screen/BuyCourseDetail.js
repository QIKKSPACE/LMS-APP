// src/Screen/BuyCourseDetail.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../Context/AuthContext';
import { getCourseById } from '../Services/courseService';
import {
  initIAP,
  requestPurchase,
  recordPurchaseInFirestore,
  setupIAPListeners,
  removeIAPListeners,
  endIAP,
  playStoreProductIdFromCourseId,
} from '../Services/iapService';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

/** Leave buy flow and open Main tabs on My Courses (reliable vs nested navigate). */
function goToMyCourses(navigation) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'MainApp',
          state: {
            routes: [{ name: 'Mycourse' }],
            index: 0,
          },
        },
      ],
    })
  );
}

const BuyCourseDetailScreen = ({ route, navigation }) => {
  const { course: initialCourse, courseId } = route.params || {};
  const { user } = useAuth();
  
  const [course, setCourse] = useState(initialCourse || null);
  const [loading, setLoading] = useState(!initialCourse);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccessVisible, setPurchaseSuccessVisible] = useState(false);

  const courseRef = useRef(course);
  courseRef.current = course;

  const redirectAfterPurchaseRef = useRef(null);

  useEffect(() => {
    const setupIAP = async () => {
      await initIAP();
      setupIAPListeners(
        async (purchase) => {
          try {
            console.log('📦 Purchase processed by listener');
            const currentCourse = courseRef.current;
            if (!currentCourse?.id) {
              console.error('❌ No course in context when purchase completed');
              setPurchasing(false);
              Toast.show({
                type: 'error',
                text1: 'Could not link purchase',
                text2: 'Please reopen this course screen and use Restore if needed.',
              });
              return;
            }

            const expectedSku = playStoreProductIdFromCourseId(currentCourse.id);
            if (purchase.productId && purchase.productId !== expectedSku) {
              console.warn('📦 productId mismatch:', purchase.productId, 'expected', expectedSku);
              setPurchasing(false);
              Toast.show({
                type: 'error',
                text1: 'Purchase mismatch',
                text2: 'This receipt does not match this course. Contact support if you were charged.',
              });
              return;
            }

            const result = await recordPurchaseInFirestore(purchase, currentCourse);
            if (result.success) {
              setPurchasing(false);
              setPurchaseSuccessVisible(true);
              if (redirectAfterPurchaseRef.current) {
                clearTimeout(redirectAfterPurchaseRef.current);
              }
              redirectAfterPurchaseRef.current = setTimeout(() => {
                redirectAfterPurchaseRef.current = null;
                setPurchaseSuccessVisible(false);
                goToMyCourses(navigation);
              }, 2200);
            }
          } catch (err) {
            console.error('❌ Firestore update error:', err);
            setPurchasing(false);
            Toast.show({ type: 'error', text1: 'Update failed', text2: 'Failed to register your purchase. Please contact support.' });
          }
        },
        (error) => {
          console.log('📦 Purchase Error (listener):', error);
          setPurchasing(false);
          if (error?.code !== 'E_USER_CANCELLED') {
              Toast.show({ type: 'error', text1: 'Purchase failed', text2: error?.message || 'Transaction error' });
          }
        }
      );
    };
    setupIAP();

    return () => {
      if (redirectAfterPurchaseRef.current) {
        clearTimeout(redirectAfterPurchaseRef.current);
        redirectAfterPurchaseRef.current = null;
      }
      removeIAPListeners();
      endIAP();
    };
    // IAP must not tear down when `course` loads from Firestore (would drop the purchase event mid-flow).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- course via courseRef
  }, []);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!course && courseId) {
        try {
          setLoading(true);
          const result = await getCourseById(courseId);
          if (result.success) {
            setCourse(result.course);
          } else {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Course not found' });
          }
        } catch (error) {
          console.error('Fetch error:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchCourse();
  }, [courseId]);

  const handleBuyNow = async () => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    if (!course?.id) return;
    
    try {
      setPurchasing(true);
      // Play product id = sanitized/lowercased course id (same as admin sync)
      const sku = playStoreProductIdFromCourseId(course.id);
      console.log('🛒 Initiating requestPurchase for SKU:', sku, '(course.id:', course.id, ')');
      await requestPurchase(sku);
      // The listener in useEffect will handle the results
    } catch (error) {
      console.error('Purchase initiation error:', error);
      setPurchasing(false);
      if (error?.code !== 'E_USER_CANCELLED') {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Could not start payment process. Please try again.' });
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading course details...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={64} color="#DC2626" />
        <Text style={styles.errorText}>No course data found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backBtnText}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const isOwned = course.isPurchased || false;
  const displayTitle = course.courseTitle || course.title || 'Course Details';
  const displayPrice = course.discountPrice || course.coursePrice || course.price || '0';
  const originalPrice = course.coursePrice || course.price || '0';
  const displayThumbnail = course.courseThumbnail || course.thumbnail || course.imageUrl;
  const displayDescription = course.courseDescription || course.description || 'No description available for this course.';
  
  const discountPercent = originalPrice > 0 ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Branded Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => goToMyCourses(navigation)}>
          <MaterialCommunityIcons name="library-video" size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner with clean content-first look */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: displayThumbnail || 'https://via.placeholder.com/600x400' }} 
            style={styles.bannerImage} 
            resizeMode="cover" 
          />
        </View>

        {/* Course Details Content */}
        <View style={styles.content}>
          <View style={styles.topInfoRow}>
            <Text style={styles.detailPageTitle}>{displayTitle}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>VALIDITY</Text>
              <Text style={styles.statValue}>{course.courseValidityMonths || course.validityMonths || 1} Month{(course.courseValidityMonths || 1) == 1 ? '' : 's'}</Text>
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Course Description</Text>
            <Text style={styles.descriptionBody}>{displayDescription}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Price/Purchase Bar */}
      <View style={styles.footer}>
        {!isOwned ? (
          <View style={styles.purchaseRow}>
            <View style={styles.priceInfo}>
              <Text style={styles.footerPriceLabel}>Total Tuition</Text>
              <View style={styles.footerPriceRow}>
                <Text style={styles.footerPriceCurrency}>₹</Text>
                <Text style={styles.footerPriceValue}>{displayPrice}</Text>
                {discountPercent > 0 && <Text style={styles.footerOriginalPrice}>₹{originalPrice}</Text>}
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.buyBtn, purchasing && styles.btnDisabled]} 
              onPress={handleBuyNow} 
              disabled={purchasing}
            >
              <LinearGradient colors={['#DC2626', '#991b1b']} style={styles.btnGradient}>
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Buy Course Now</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.fullWidthBtn} 
            onPress={() => goToMyCourses(navigation)}
          >
            <LinearGradient colors={['#10b981', '#059669']} style={styles.btnGradient}>
              <Text style={styles.btnText}>View in Your Library</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={purchaseSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPurchaseSuccessVisible(false)}
      >
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <Icon name="check-circle" size={56} color="#059669" />
            <Text style={styles.successModalTitle}>Course purchased successfully</Text>
            <Text style={styles.successModalSub}>
              Your course is unlocked. Opening My Courses…
            </Text>
            <TouchableOpacity
              style={styles.successModalBtn}
              onPress={() => {
                if (redirectAfterPurchaseRef.current) {
                  clearTimeout(redirectAfterPurchaseRef.current);
                  redirectAfterPurchaseRef.current = null;
                }
                setPurchaseSuccessVisible(false);
                goToMyCourses(navigation);
              }}
            >
              <Text style={styles.successModalBtnText}>Go to My Courses now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#4B5563', fontWeight: '600' },
  errorText: { fontSize: 16, color: '#DC2626', fontWeight: 'bold' },
  backBtn: { marginTop: 20, padding: 10, backgroundColor: '#111827', borderRadius: 8 },
  backBtnText: { color: '#fff' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerIcon: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  scrollContent: { paddingBottom: 120 },
  bannerContainer: { width: '100%', height: 280, backgroundColor: '#f3f4f6' },
  bannerImage: { width: '100%', height: '100%' },
  content: { padding: 24, paddingTop: 20 },
  topInfoRow: { marginBottom: 16 },
  detailPageTitle: { fontSize: 32, fontWeight: '900', color: '#111827', lineHeight: 40 },
  statsRow: { marginTop: 10, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  statItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#111827' },
  descriptionSection: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  descriptionBody: { fontSize: 16, lineHeight: 26, color: '#4B5563', textAlign: 'justify' },
  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceInfo: { flex: 1 },
  footerPriceLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, marginBottom: 4 },
  footerPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  footerPriceCurrency: { fontSize: 16, fontWeight: '900', color: '#111827', marginRight: 2 },
  footerPriceValue: { fontSize: 26, fontWeight: '900', color: '#111827' },
  footerOriginalPrice: { fontSize: 14, color: '#9CA3AF', textDecorationLine: 'line-through', marginLeft: 8, fontWeight: '600' },
  buyBtn: { flex: 1, marginLeft: 20, height: 56, borderRadius: 16, overflow: 'hidden' },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.7 },
  fullWidthBtn: { width: '100%', height: 56, borderRadius: 16, overflow: 'hidden' },
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  successModalTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  successModalSub: {
    marginTop: 10,
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  successModalBtn: {
    marginTop: 22,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  successModalBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default BuyCourseDetailScreen;