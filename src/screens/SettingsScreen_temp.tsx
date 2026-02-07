import React, { memo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface SettingsScreenProps {
    onClose: () => void;
}

interface SettingsFolder {
    id: string;
    label: string;
    icon: string;
    subtitle?: string;
}

const SettingsScreen: React.FC<SettingsScreenProps> = memo(function SettingsScreen({ onClose }) {
    const { colors } = useTheme();
    const { theme } = useSettingsStore();

    const folders: SettingsFolder[] = [
        {
            id: 'appearance',
            label: 'Appearance',
            icon: 'palette-outline',
            subtitle: 'Theme, colors, fonts',
        },
        {
            id: 'playback',
            label: 'Playback',
            icon: 'play-circle-outline',
            subtitle: 'Speed, skip, equalizer',
        },
        {
            id: 'library',
            label: 'Library',
            icon: 'folder-music-outline',
            subtitle: 'Scan, folders, auto-tag',
        },
        {
            id: 'data',
            label: 'Data & Backup',
            icon: 'backup-restore',
            subtitle: 'Backup, restore, cache',
        },
        {
            id: 'advanced',
            label: 'Advanced',
            icon: 'cog-outline',
            subtitle: 'Debug, performance, controls',
        },
        {
            id: 'unsorted',
            label: '%Unsorted Settings%',
            icon: 'package-variant',
            subtitle: 'Misc settings',
        },
    ];

    return (
        <Modal
            visible={true}
            animationType="slide"
            transparent={false}
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar
                    barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
                    backgroundColor={colors.surface}
                />

                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Settings
                    </Text>
                    <View style={styles.closeButton} />
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {folders.map((folder, index) => (
                        <TouchableOpacity
                            key={folder.id}
                            style={[
                                styles.folderItem,
                                { backgroundColor: colors.surface },
                                index === 0 && styles.folderItemFirst,
                            ]}
                            onPress={() => {
                                // TODO: Navigate to folder screen
                                console.log(`Navigate to ${folder.id}`);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: colors.surfaceElevated }]}>
                                <Icon name={folder.icon} size={24} color={colors.accent} />
                            </View>
                            <View style={styles.folderContent}>
                                <Text style={[styles.folderLabel, { color: colors.textPrimary }]}>
                                    {folder.label}
                                </Text>
                                {folder.subtitle && (
                                    <Text style={[styles.folderSubtitle, { color: colors.textSecondary }]}>
                                        {folder.subtitle}
                                    </Text>
                                )}
                            </View>
                            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    ))}

                    {/* Bottom spacing */}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </Modal>
    );
});


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    closeButton: {
        padding: spacing.xs,
        width: 40,
    },
    headerTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    folderItemFirst: {
        marginTop: spacing.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    folderContent: {
        flex: 1,
    },
    folderLabel: {
        fontSize: typography.sizes.lg,
        fontWeight: '600',
        marginBottom: 2,
    },
    folderSubtitle: {
        fontSize: typography.sizes.sm,
        opacity: 0.7,
    },
});

export default SettingsScreen;
