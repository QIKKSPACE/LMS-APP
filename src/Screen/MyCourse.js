import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const CoursesScreen = () => {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'In Progress', 'Completed', 'Expired'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Courses</Text>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🦁</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search your courses..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Course Card */}
        <View style={styles.courseCard}>
          {/* Course Thumbnail */}
          <View style={styles.thumbnailContainer}>
            <View style={styles.thumbnail}>
              <Text style={styles.thumbnailText}>Never lose important content again</Text>
              <Text style={styles.thumbnailSubtext}>with Secona Brain</Text>
              <View style={styles.thumbnailImages}>
                <Text style={styles.deviceEmoji}>💻 📱 🖥️</Text>
              </View>
            </View>
            <View style={styles.chaptersBadge}>
              <Text style={styles.chaptersIcon}>📚</Text>
              <Text style={styles.chaptersText}>0 Chapters</Text>
            </View>
          </View>

          {/* Course Info */}
          <View style={styles.courseInfo}>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>

            <View style={styles.courseTitleRow}>
              <Text style={styles.courseTitle}>Node.js Course</Text>
              <View style={styles.paidBadge}>
                <Text style={styles.paidText}>PAID</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>0%</Text>
            </View>

            <Text style={styles.completionText}>0% completed - Keep going!</Text>

            {/* Valid Until */}
            <View style={styles.validContainer}>
              <Text style={styles.calendarIcon}>📅</Text>
              <Text style={styles.validText}>Valid until Nov 29, 2026</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#000',
  },
  searchButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  searchIcon: {
    fontSize: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 5,
    backgroundColor: '#fff',
    gap: 10,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  activeTab: {
    backgroundColor: '#E91E63',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  courseCard: {
    margin: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    height: 180,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  thumbnailText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  thumbnailSubtext: {
    color: '#FF6B6B',
    fontSize: 16,
    marginTop: 5,
  },
  thumbnailImages: {
    marginTop: 15,
  },
  deviceEmoji: {
    fontSize: 30,
  },
  chaptersBadge: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 5,
  },
  chaptersIcon: {
    fontSize: 14,
  },
  chaptersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  courseInfo: {
    padding: 20,
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 5,
    marginBottom: 10,
  },
  premiumText: {
    color: '#E91E63',
    fontSize: 11,
    fontWeight: 'bold',
  },
  courseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  paidBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  paidText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    width: '0%',
    height: '100%',
    backgroundColor: '#E91E63',
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  completionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  validContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  calendarIcon: {
    fontSize: 16,
  },
  validText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
});

export default CoursesScreen;