/**
 * useFolderDetection Hook
 * Shared folder detection logic used by both onboarding and settings screens
 */

import { useState, useEffect } from 'react';
import { fileSystemService } from '@/services/FileSystemService';

export interface DetectedFolder {
    path: string;
    name: string;
    selected: boolean;
    estimatedCount?: number;
}

export const useFolderDetection = (initialSelected: string[] = []) => {
    const [isScanning, setIsScanning] = useState(true);
    const [detectedFolders, setDetectedFolders] = useState<DetectedFolder[]>([]);

    useEffect(() => {
        detectMusicFolders();
    }, []);

    const detectMusicFolders = async () => {
        setIsScanning(true);
        try {
            // Common music directories
            const commonPaths = [
                '/storage/emulated/0/Music',
                '/storage/emulated/0/Download',
                '/storage/emulated/0/Downloads',
                '/storage/emulated/0/DCIM',
                '/storage/emulated/0/Podcasts',
            ];

            const folders: DetectedFolder[] = [];
            for (const path of commonPaths) {
                try {
                    const exists = await fileSystemService.exists(path);
                    if (exists) {
                        // Only include if it's in initialSelected, or if initialSelected is empty (onboarding)
                        const shouldInclude = initialSelected.length === 0 || initialSelected.includes(path);
                        if (shouldInclude) {
                            folders.push({
                                path,
                                name: path.split('/').pop() || path,
                                selected: true, // All folders in the list are "selected"
                            });
                        }
                    }
                } catch (e) {
                    // Folder doesn't exist or no access
                }
            }

            // Also add any folders from initialSelected that weren't detected as common paths
            for (const selectedPath of initialSelected) {
                if (!folders.some(f => f.path === selectedPath)) {
                    folders.push({
                        path: selectedPath,
                        name: selectedPath.split('/').pop() || selectedPath,
                        selected: true,
                    });
                }
            }

            setDetectedFolders(folders);
        } catch (error) {
            console.error('Error detecting folders:', error);
        }
        setIsScanning(false);
    };

    const toggleFolder = (index: number) => {
        setDetectedFolders(prev =>
            prev.map((folder, i) =>
                i === index ? { ...folder, selected: !folder.selected } : folder
            )
        );
    };

    const addFolder = (path: string) => {
        const exists = detectedFolders.some(f => f.path === path);
        if (!exists) {
            const folderName = path.split('/').pop() || path;
            setDetectedFolders([
                ...detectedFolders,
                {
                    path,
                    name: folderName,
                    selected: true,
                    estimatedCount: 0,
                }
            ]);
        }
    };

    const removeFolder = (index: number) => {
        setDetectedFolders(prev => prev.filter((_, i) => i !== index));
    };

    const getSelectedPaths = (): string[] => {
        return detectedFolders.filter(f => f.selected).map(f => f.path);
    };

    return {
        isScanning,
        detectedFolders,
        toggleFolder,
        addFolder,
        removeFolder,
        getSelectedPaths,
        detectMusicFolders,
    };
};
