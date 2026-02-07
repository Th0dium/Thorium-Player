/**
 * Folder Selection Screen
 * Allows users to select which folders to scan for music files
 * Uses shared useFolderDetection hook with ScannerSetupScreen
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';
import { useFolderDetection } from '../../hooks/useFolderDetection';
import { FolderList } from '../../components/FolderList';
import FolderBrowser from '../../components/FolderBrowser';

export const FolderSelectionScreen: React.FC = () => {
    const { colors } = useTheme();
    const scanFolders = useSettingsStore((state) => state.scanFolders);
    const setScanFolders = useSettingsStore((state) => state.setScanFolders);
    const [showFolderBrowser, setShowFolderBrowser] = useState(false);

    const {
        isScanning,
        detectedFolders,
        addFolder,
        removeFolder,
        getSelectedPaths,
    } = useFolderDetection(scanFolders);

    const folderCount = detectedFolders.length;

    const handleSave = async () => {
        if (detectedFolders.length === 0) {
            Alert.alert('No Folders Added', 'Please add at least one folder to scan for music.');
            return;
        }
        const paths = detectedFolders.map(f => f.path);
        setScanFolders(paths);
        Alert.alert('Success', 'Folder settings saved.');
    };

    const handleManualFolderSelect = (path: string) => {
        addFolder(path);
        setShowFolderBrowser(false);
    };

    if (isScanning) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContainer}>
                    <FolderList
                        folders={[]}
                        isScanning={true}
                        onRemoveFolder={() => { }}
                        onAddCustomFolder={() => { }}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerText, { color: colors.text }]}>
                        {folderCount === 0 ? 'No folders' : `${folderCount} folder${folderCount === 1 ? '' : 's'}`}
                    </Text>
                </View>

                {/* Folder List Component */}
                <FolderList
                    folders={detectedFolders}
                    isScanning={isScanning}
                    onRemoveFolder={removeFolder}
                    onAddCustomFolder={() => setShowFolderBrowser(true)}
                />

                {/* Info text */}
                <View style={styles.infoSection}>
                    <Icon name="information-circle-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Selected folders will be scanned for music files when you tap "Rescan Library"
                    </Text>
                </View>
            </ScrollView>

            {/* Save button */}
            <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                activeOpacity={0.8}
            >
                <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

            {/* Folder Browser Modal */}
            <Modal
                visible={showFolderBrowser}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowFolderBrowser(false)}
            >
                <FolderBrowser
                    onSelectFolder={handleManualFolderSelect}
                    onClose={() => setShowFolderBrowser(false)}
                />
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingBottom: 80,
    },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerText: {
        fontSize: 16,
        fontWeight: '600',
    },
    infoSection: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 8,
    },
    infoText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    saveButton: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
