// AnimatedPressable - Reusable animated touchable with scale feedback + ripple
// Uses react-native Animated API for performant press animations
import React, { useRef, useCallback, memo } from 'react';
import {
    Animated,
    Pressable,
    ViewStyle,
    StyleProp,
    GestureResponderEvent,
    Platform,
} from 'react-native';

interface AnimatedPressableProps {
    children: React.ReactNode;
    onPress?: (e?: GestureResponderEvent) => void;
    onLongPress?: (e?: GestureResponderEvent) => void;
    style?: StyleProp<ViewStyle>;
    scaleDown?: number; // How much to scale down on press (default 0.97)
    disabled?: boolean;
    delayLongPress?: number;
    hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
    rippleColor?: string; // Android ripple color (default semi-transparent white)
    disableRipple?: boolean;
}

const AnimatedPressable: React.FC<AnimatedPressableProps> = memo(({
    children,
    onPress,
    onLongPress,
    style,
    scaleDown = 0.97,
    disabled = false,
    delayLongPress = 300,
    hitSlop,
    rippleColor = 'rgba(255, 255, 255, 0.15)',
    disableRipple = false,
}) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scale, {
            toValue: scaleDown,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    }, [scale, scaleDown]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 40,
            bounciness: 6,
        }).start();
    }, [scale]);

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            delayLongPress={delayLongPress}
            hitSlop={hitSlop}
            android_ripple={
                Platform.OS === 'android' && !disableRipple
                    ? { color: rippleColor, borderless: false }
                    : undefined
            }
        >
            <Animated.View style={[style, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
});

AnimatedPressable.displayName = 'AnimatedPressable';

export default AnimatedPressable;
