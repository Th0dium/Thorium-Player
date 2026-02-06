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
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore, ALL_TABS, TabId, ThemeOption, FolderViewOption } from '@/store/settingsStore';

interface UIPreferencesScreenProps {
    onNext: () => void;
    onBack: () => void;
}

const UIPreferencesScreen: React.FC<UIPreferencesScreenProps> = ({ onNext, onBack }) => {
    const { colors } = useTheme();
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
                    <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
                    <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
                    <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]}>Customize Your Experience</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Make Thorium feel like your own
                </Text>

                {/* Tab Manager */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Navigation Tabs</Text>
                    <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                        Choose 2-5 tabs for your bottom navigation
                    </Text>
                    <Text style={[styles.tabCount, { color: colors.primary }]}>
                        {selectedTabs.length} of 5 selected
                    </Text>

                    <View style={styles.tabsGrid}>
                        {ALL_TABS.map(tab => (
                            <TouchableOpacity
                                key={tab.id}
                                style={[
                                    styles.tabOption,
                                    { backgroundColor: colors.surface },
                                    selectedTabs.includes(tab.id) && {
                                        borderColor: colors.primary,
                                        backgroundColor: colors.primary + '10'
                                    }
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
                                    { color: selectedTabs.includes(tab.id) ? colors.text : colors.textSecondary }
                                ]}>
                                    {tab.label}
                                </Text>
                                {selectedTabs.includes(tab.id) && (
                                    <View style={[styles.tabCheck, { backgroundColor: colors.primary }]}>
                                        <Icon name="check" size={12} color={colors.background} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Folder View */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Folder View Style</Text>
                    <View style={styles.folderViewOptions}>
                        {folderViews.map(view => (
                            <TouchableOpacity
                                key={view.id}
                                style={[
                                    styles.folderViewOption,
                                    { backgroundColor: colors.surface },
                                    folderView === view.id && {
                                        borderColor: colors.primary,
                                        backgroundColor: colors.primary + '10'
                                    }
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
                                    { color: folderView === view.id ? colors.text : colors.textSecondary }
                                ]}>
                                    {view.label}
                                </Text>
                                <Text style={[styles.folderViewDescription, { color: colors.textMuted }]}>
                                    {view.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Theme Selection */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>App Theme</Text>
                    <View style={styles.themeOptions}>
                        {themes.map(t => (
                            <TouchableOpacity
                                key={t.id}
                                style={[
                                    styles.themeOption,
                                    { backgroundColor: colors.surface },
                                    theme === t.id && {
                                        borderColor: colors.primary,
                                        backgroundColor: colors.primary + '10'
                                    }
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
                                    { color: theme === t.id ? colors.text : colors.textSecondary }
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
                    <Text style={[styles.previewNoteText, { color: colors.textMuted }]}>
                        These settings can be changed anytime in Settings
                    </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.continueButton, { backgroundColor: colors.primary }]}
                    onPress={handleContinue}
                >
                    <Text style={[styles.continueButtonText, { color: colors.background }]}>Almost Done!</Text>
                    <Icon name="arrow-right" size={20} color={colors.background} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        marginHorizontal: spacing.xs,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: typography.sizes.md,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.xs,
    },
    sectionDescription: {
        fontSize: typography.sizes.sm,
        marginBottom: spacing.sm,
    },
    tabCount: {
        fontSize: typography.sizes.xs,
        marginBottom: spacing.md,
    },
    tabsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
    },
    tabOption: {
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        width: '31%',
        marginHorizontal: spacing.xs,
        marginBottom: spacing.sm,
        position: 'relative',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    tabLabel: {
        fontSize: typography.sizes.xs,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    tabCheck: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    folderViewOptions: {
        flexDirection: 'row',
        marginHorizontal: -spacing.xs,
    },
    folderViewOption: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        marginHorizontal: spacing.xs,
    },
    folderViewLabel: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
        marginTop: spacing.sm,
    },
    folderViewDescription: {
        fontSize: typography.sizes.xs,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    themeOptions: {
        flexDirection: 'row',
        marginHorizontal: -spacing.xs,
    },
    themeOption: {
        flex: 1,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        marginHorizontal: spacing.xs,
    },
    themeLabel: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.sm,
    },
    previewNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xxl,
    },
    previewNoteText: {
        fontSize: typography.sizes.xs,
        marginLeft: spacing.xs,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    continueButton: {
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
        marginRight: spacing.sm,
    },
});

export default UIPreferencesScreen;
