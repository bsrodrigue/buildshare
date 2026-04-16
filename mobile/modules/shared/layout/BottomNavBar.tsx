import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface TabItem {
  name: string;
  icon: string;
  color: string;
  label?: string;
}

const tabIconMap: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  home: 'home',
  motorcycle: 'bicycle',
  history: 'time',
  'user-circle': 'person-circle',
  bars: 'menu',
  briefcase: 'briefcase',
  bookmark: 'bookmark',
  'file-alt': 'document-text',
  users: 'people',
  wallet: 'wallet',
  store: 'storefront',
  receipt: 'receipt',
  'chart-bar': 'bar-chart',
  'box-open': 'cube',
};

interface BottomNavBarProps {
  activeTab: string;
  tabItems: TabItem[];
  onTabPress: (tabName: string) => void;
  backgroundColor?: string;
}

export const BottomNavBar = ({
  activeTab,
  tabItems,
  onTabPress,
  backgroundColor,
}: BottomNavBarProps) => {
  const pathname = usePathname();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const inactiveColor = 'rgba(255,255,255,0.72)';

  const isTabActive = (tabName: string) => {
    const _activeTab = (activeTab || '').split('/')[0];

    if (_activeTab === tabName) return true;

    const pathSegments = pathname.split('/').filter(Boolean);
    return pathSegments.some((segment) => segment === tabName);
  };

  const resolveIconName = (icon: string): React.ComponentProps<typeof Ionicons>['name'] =>
    tabIconMap[icon] ?? 'ellipse';

  const BASE_HEIGHT = 72;
  return (
    <View
      style={[
        styles.container,
        {
          height: BASE_HEIGHT + insets.bottom,
          paddingBottom: theme.spacing.xs + insets.bottom,
        },
        backgroundColor ? { backgroundColor } : undefined,
      ]}
    >
      {tabItems.map((tabItem, index) => (
        <TouchableOpacity
          key={`${tabItem.name}-${index}`}
          style={styles.tab}
          onPress={() => onTabPress?.(tabItem.name)}
          activeOpacity={0.8}
        >
          <View style={[styles.tabInner, isTabActive(tabItem.name) && styles.activeTabInner]}>
            <Ionicons
              name={resolveIconName(tabItem.icon)}
              size={18}
              color={isTabActive(tabItem.name) ? theme.colors.accent : inactiveColor}
            />
            {tabItem.label ? (
              <Text
                style={[
                  styles.label,
                  isTabActive(tabItem.name) ? styles.activeLabel : styles.inactiveLabel,
                ]}
              >
                {tabItem.label}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: theme.spacing.sm,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    tabInner: {
      minWidth: 52,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 16,
    },
    activeTabInner: {
      backgroundColor: toAlpha(theme.colors.textOnPrimary, 0.08),
    },
    label: {
      fontSize: 10,
      fontWeight: '700',
    },
    activeLabel: {
      color: theme.colors.accent,
    },
    inactiveLabel: {
      color: toAlpha(theme.colors.textOnPrimary, 0.72),
    },
  });
