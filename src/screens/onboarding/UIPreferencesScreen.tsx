// UI Preferences Screen - Customize app appearance and navigation
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useSettingsStore, ALL_TABS, TabId, ThemeOption, FolderViewOption } from '@/store/settingsStore';

interface UIPreferencesScreenProps {
    onNext: () => void;
    onBack: () => void;
}

const UIPreferencesScreen: React.FC<UIPreferencesScreenProps> = ({ onNext, onBack }) => {
    const {
        selectedTabs,
        theme,
        folderView,
        setSelectedTabs,
        setTheme,
        setFolderView,
    } = useSettingsStore();

    const themes: { id: ThemeOption; label: string; icon: string }[] = [
        { id: 'dark', label: 'Dark', icon: 'weather-night' },
        { id: 'light', label: 'Light', icon: 'white-balance-sunny' },
        { id: 'system', label: 'System', icon: 'theme-light-dark' },
    ];

    const folderViews: { id: FolderViewOption; label: string; description: string; icon: string }[] = [
        { id: 'linear', label: 'Linear', description: 'Flat list of all folders', icon: 'view-list' },
        { id: 'hierarchical', label: 'Hierarchical', description: 'Tree structure like a file manager', icon: 'file-tree' },
    ];

    const toggleTab = (tabId: TabId) => {
        if (selectedTabs.includes(tabId)) {
            if (selectedTabs.length > 2) { // Minimum 2 tabs
                setSelectedTabs(selectedTabs.filter(t => t !== tabId));
            }
        } else {
            if (selectedTabs.length < 5) { // Maximum 5 tabs
                setSelectedTabs([...selectedTabs, tabId]);
            }
        }
    };

    const handleContinue = () => {
        // Settings are already saved via the store
        onNext();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                </View>

                {/* Title */}
                <Text style={styles.title}>Customize Your Experience</Text>
                <Text style={styles.description}>
                    Make Thorium feel like your own
                </Text>

                {/* Tab Manager */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Navigation Tabs</Text>
                    <Text style={styles.sectionDescription}>
                        Choose 2-5 tabs for your bottom navigation
                    </Text>
                    <Text style={styles.tabCount}>
                        {selectedTabs.length} of 5 selected
                    </Text>

                    <View style={styles.tabsGrid}>
                        {ALL_TABS.map(tab => (
                            <TouchableOpacity
                                key={tab.id}
                                style={[
                                    styles.tabOption,
                                    selectedTabs.includes(tab.id) && styles.tabOptionActive
                                ]}
                                onPress={() => toggleTab(tab.id)}
                            >
                                <Icon
                                    name={tab.icon}
                                    size={24}
                                    color={selectedTabs.includes(tab.id) ? colors.primary : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.tabLabel,
                                    selectedTabs.includes(tab.id) && styles.tabLabelActive
                                ]}>
                                    {tab.label}
                                </Text>
                                {selectedTabs.includes(tab.id) && (
                                    <View style={styles.tabCheck}>
                                        <Icon name="check" size={12} color={colors.background} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Folder View */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Folder View Style</Text>
                    <View style={styles.folderViewOptions}>
                        {folderViews.map(view => (
                            <TouchableOpacity
                                key={view.id}
                                style={[
                                    styles.folderViewOption,
                                    folderView === view.id && styles.folderViewOptionActive
                                ]}
                                onPress={() => setFolderView(view.id as FolderViewOption)}
                            >
                                <Icon
                                    name={view.icon}
                                    size={32}
                                    color={folderView === view.id ? colors.primary : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.folderViewLabel,
                                    folderView === view.id && styles.folderViewLabelActive
                                ]}>
                                    {view.label}
                                </Text>
                                <Text style={styles.folderViewDescription}>
                                    {view.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Theme Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Theme</Text>
                    <View style={styles.themeOptions}>
                        {themes.map(t => (
                            <TouchableOpacity
                                key={t.id}
                                style={[
                                    styles.themeOption,
                                    theme === t.id && styles.themeOptionActive
                                ]}
                                onPress={() => setTheme(t.id as ThemeOption)}
                            >
                                <Icon
                                    name={t.icon}
                                    size={24}
                                    color={theme === t.id ? colors.primary : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.themeLabel,
                                    theme === t.id && styles.themeLabelActive
                                ]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Preview note */}
                <View style={styles.previewNote}>
                    <Icon name="information" size={16} color={colors.textMuted} />
                    <Text style={styles.previewNoteText}>
                        These settings can be changed anytime in Settings
                    </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                    <Text style={styles.continueButtonText}>Almost Done!</Text>
                    <Icon name="arrow-right" size={20} color={colors.background} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    backButton: {
        padding: spacing.sm,
        marginLeft: -spacing.sm,
        marginBottom: spacing.lg,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xs,
    },
    progressDotActive: {
        backgroundColor: colors.primary,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    sectionDescription: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    tabCount: {
        fontSize: typography.sizes.xs,
        color: colors.primary,
        marginBottom: spacing.md,
    },
    tabsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tabOption: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        minWidth: '30%',
        flex: 1,
        maxWidth: '32%',
        position: 'relative',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    tabOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    tabLabel: {
        fontSize: typography.sizes.xs,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    tabLabelActive: {
        color: colors.text,
    },
    tabCheck: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    folderViewOptions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    folderViewOption: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    folderViewOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    folderViewLabel: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    folderViewLabelActive: {
        color: colors.text,
    },
    folderViewDescription: {
        fontSize: typography.sizes.xs,
        color: colors.textMuted,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    themeOptions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    themeOption: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    themeOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    themeLabel: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    themeLabelActive: {
        color: colors.text,
    },
    previewNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xxl,
    },
    previewNoteText: {
        fontSize: typography.sizes.xs,
        color: colors.textMuted,
        marginLeft: spacing.xs,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    continueButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.background,
        marginRight: spacing.sm,
    },
});

export default UIPreferencesScreen;
