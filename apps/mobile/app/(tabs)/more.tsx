import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '@/lib/colors';
import { useAuth } from '@/lib/AuthContext';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  showChevron?: boolean;
}

function MenuItem({ icon, label, subtitle, onPress, danger, showChevron = true }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? Colors.red : Colors.navy}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
          {label}
        </Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && onPress && (
        <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
      )}
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { user, logout, switchOrganization } = useAuth();

  const currentOrg = user?.organizations?.[0];
  const appVersion = Constants.expoConfig?.version ?? '0.1.0';

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout,
        },
      ],
    );
  };

  const handleSwitchOrg = () => {
    if (!user?.organizations || user.organizations.length <= 1) {
      Alert.alert('Switch Organization', 'You only have one organization.');
      return;
    }

    // In a full implementation, this would show a modal picker
    Alert.alert(
      'Switch Organization',
      'Select an organization:',
      user.organizations.map((org) => ({
        text: org.name,
        onPress: () => switchOrganization(org.id),
      })),
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name ?? 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          {currentOrg && (
            <View style={styles.orgBadge}>
              <Ionicons name="business-outline" size={12} color={Colors.green} />
              <Text style={styles.orgBadgeText}>{currentOrg.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Organization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Organization</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="business-outline"
            label="Organization Details"
            subtitle={currentOrg?.name}
            onPress={() => {}}
          />
          <MenuItem
            icon="swap-horizontal-outline"
            label="Switch Organization"
            onPress={handleSwitchOrg}
          />
          <MenuItem
            icon="people-outline"
            label="Team Members"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="settings-outline"
            label="Invoice Settings"
            onPress={() => {}}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="help-circle-outline"
            label="Help & FAQ"
            onPress={() => {}}
          />
          <MenuItem
            icon="chatbubble-outline"
            label="Contact Support"
            onPress={() => {}}
          />
          <MenuItem
            icon="document-text-outline"
            label="Terms & Privacy"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleLogout}
            danger
            showChevron={false}
          />
        </View>
      </View>

      {/* App Version */}
      <Text style={styles.version}>Kontafy v{appVersion}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  orgBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.green,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuGroup: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconDanger: {
    backgroundColor: Colors.redLight,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.ink,
  },
  menuLabelDanger: {
    color: Colors.red,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 1,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.muted,
    marginTop: 32,
  },
});
