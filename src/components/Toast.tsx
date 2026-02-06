// Toast - Animated toast notification system
// Slides in from top with spring animation, auto-dismisses
import React, { useEffect, useRef, useCallback, useState, createContext, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    icon?: string;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number, icon?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
});

export const useToast = () => useContext(ToastContext);

// Individual toast component
const ToastItem: React.FC<{
    toast: ToastData;
    onDismiss: (id: string) => void;
    topOffset: number;
}> = React.memo(({ toast, onDismiss, topOffset }) => {
    const { colors } = useTheme();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const iconMap: Record<ToastType, string> = {
        success: 'check-circle',
        error: 'alert-circle',
        info: 'information',
        warning: 'alert',
    };

    const colorMap: Record<ToastType, string> = {
        success: '#4CAF50',
        error: '#F44336',
        info: colors.primary,
        warning: '#FF9800',
    };

    useEffect(() => {
        // Slide in
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: topOffset,
                useNativeDriver: true,
                tension: 80,
                friction: 12,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss
        const timer = setTimeout(() => {
            dismiss();
        }, toast.duration || 3000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dismiss = useCallback(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss(toast.id);
        });
    }, [slideAnim, opacityAnim, onDismiss, toast.id]);

    const iconName = toast.icon || iconMap[toast.type];
    const accentColor = colorMap[toast.type];

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                    backgroundColor: colors.surface,
                    borderLeftColor: accentColor,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.toastContent}
                onPress={dismiss}
                activeOpacity={0.9}
            >
                <Icon name={iconName} size={20} color={accentColor} />
                <Text style={[styles.toastMessage, { color: colors.textPrimary }]} numberOfLines={2}>
                    {toast.message}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Toast provider component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const insets = useSafeAreaInsets();

    const showToast = useCallback((
        message: string,
        type: ToastType = 'info',
        duration: number = 3000,
        icon?: string,
    ) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        setToasts(prev => [...prev.slice(-2), { id, message, type, duration, icon }]); // Max 3 toasts
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <View style={styles.toastOverlay} pointerEvents="box-none">
                {toasts.map((toast, index) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={dismissToast}
                        topOffset={insets.top + spacing.sm + (index * 60)}
                    />
                ))}
            </View>
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },
    toastContainer: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        borderRadius: borderRadius.md,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        borderLeftWidth: 4,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    toastMessage: {
        flex: 1,
        fontSize: typography.sizes.sm,
        fontWeight: '500' as const,
    },
});

export default ToastProvider;
