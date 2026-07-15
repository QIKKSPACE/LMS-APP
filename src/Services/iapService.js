// src/Services/iapService.js
import {
    initConnection,
    endConnection,
    fetchProducts,
    requestPurchase as RNIAPRequestPurchase,
    purchaseUpdatedListener,
    purchaseErrorListener,
    finishTransaction,
} from 'react-native-iap';
import { enrollInCourse } from './courseService';
import { db } from '../firebase';
import auth from '@react-native-firebase/auth';

let purchaseUpdateSubscription;
let purchaseErrorSubscription;

/**
 * Must match LMS-ADMIN Play sync: `sanitizeProductId` in courseProductSync
 * (Firestore course doc id → Play one-time product id).
 */
export function playStoreProductIdFromCourseId(courseId) {
    return String(courseId)
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '_')
        .slice(0, 100);
}

/**
 * Initialize IAP connection
 */
export const initIAP = async () => {
    try {
        const result = await initConnection();
        console.log('✅ IAP initialized:', result);
        // v14+ (Nitro): flushFailedPurchasesCachedAsPendingAndroid was removed; use finishTransaction / acknowledgePurchaseAndroid on purchases.
        return true;
    } catch (error) {
        console.error('❌ IAP init error:', error);
        return false;
    }
};

/**
 * Listen to purchase updates
 */
export const setupIAPListeners = (onSuccess, onError) => {
    purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
        console.log('📦 Purchase Updated:', purchase);

        if (!purchase?.productId) {
            console.warn('📦 Purchase update missing productId; ignoring');
            return;
        }

        // Deferred / incomplete billing state — do not acknowledge yet
        if (purchase.purchaseState === 'pending') {
            console.log('📦 Purchase still pending; skip finish until completed');
            return;
        }

        // v14 (Nitro): Android uses purchaseToken; legacy transactionReceipt is often absent.
        // Gating on transactionReceipt alone never fired onSuccess on Android → stuck spinner.

        try {
            await finishTransaction({ purchase, isConsumable: false });
        } catch (ackErr) {
            console.warn('finishTransaction error', ackErr);
        }

        if (onSuccess) {
            try {
                await onSuccess(purchase);
            } catch (e) {
                console.error('IAP onSuccess error:', e);
            }
        }
    });

    purchaseErrorSubscription = purchaseErrorListener((error) => {
        console.warn('📦 Purchase Error', error);
        if (onError) onError(error);
    });
};

/**
 * Remove listeners
 */
export const removeIAPListeners = () => {
    if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
        purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
        purchaseErrorSubscription = null;
    }
};

/**
 * Request a purchase
 * In RNIAP v14+, we use fetchProducts and a new requestPurchase signature
 */
export const requestPurchase = async (sku) => {
    try {
        console.log('🛒 Step 1: Loading product info for SKU:', sku);
        // fetchProducts replaces getProducts
        const products = await fetchProducts({ skus: [sku], type: 'in-app' });
        
        if (!products || products.length === 0) {
            console.error('❌ Product not found in Store. Ensure SKU is correct in Play Console:', sku);
            throw new Error('Product not found in Google Play Store. Please check if SKU is configured correctly.');
        }

        console.log('🛒 Step 2: Requesting purchase for:', sku);
        
        // requestPurchase signature has changed in v14
        await RNIAPRequestPurchase({
            request: {
                google: {
                    skus: [sku]
                }
            },
            type: 'in-app'
        });
        
    } catch (error) {
        console.error('❌ Purchase request error:', error);
        throw error;
    }
};

/**
 * Handle successful payment - Save to Firestore
 */
export const recordPurchaseInFirestore = async (purchase, courseData) => {
    try {
        const currentUser = auth().currentUser;
        if (!currentUser) throw new Error('User not authenticated');

        console.log('📝 Recording purchase for:', courseData.id);

        const enrollmentResult = await enrollInCourse(
            currentUser.uid,
            courseData.id,
            12
        );

        if (!enrollmentResult.success) {
            throw new Error('Enrollment failed: ' + (enrollmentResult.error || 'Unknown error'));
        }

        const transactionData = {
            transactionId: purchase.transactionId || purchase.orderId || `iap_${Date.now()}`,
            productId: purchase.productId,
            courseId: courseData.id,
            courseTitle: courseData.title || courseData.courseTitle || 'Course',
            amount: courseData.price,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            status: 'SUCCESS',
            paymentMethod: 'google_play_iap',
            purchaseTime: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        await db.collection('transactions').add(transactionData);
        console.log('✅ Purchase recorded');
        return { success: true };
    } catch (error) {
        console.error('❌ Record purchase error:', error);
        throw error;
    }
};

/**
 * Close IAP connection
 */
export const endIAP = async () => {
    removeIAPListeners();
    try {
        await endConnection();
        console.log('✅ IAP connection ended');
    } catch (error) {
        console.error('❌ IAP end error:', error);
    }
};
