// Alphabet Scroller - Fast scroll handle for long lists (A-Z)
// Musicolet-style: Appears on the right edge, instant jumping
import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    Dimensions,
    Animated,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface AlphabetScrollerProps {
    onLetterChange: (letter: string) => void;
    visible?: boolean;
    activeLetters?: string[]; // Letters that have items
}

const AlphabetScroller: React.FC<AlphabetScrollerProps> = ({
    onLetterChange,
    visible = true,
    activeLetters,
}) => {
    const { colors } = useTheme();
    const [currentLetter, setCurrentLetter] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);
    const indicatorY = useRef(new Animated.Value(0)).current;
    const containerRef = useRef<View>(null);
    const containerLayout = useRef({ y: 0, height: 0 });

    const letterHeight = Math.min(18, (SCREEN_HEIGHT - 200) / ALPHABET.length);

    const handleLetterFromPosition = useCallback((y: number) => {
        const relativeY = y - containerLayout.current.y;
        const index = Math.floor(relativeY / letterHeight);
        const clampedIndex = Math.max(0, Math.min(ALPHABET.length - 1, index));
        const letter = ALPHABET[clampedIndex];

        if (letter !== currentLetter) {
            setCurrentLetter(letter);
            onLetterChange(letter);
        }
    }, [currentLetter, letterHeight, onLetterChange]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                setIsActive(true);
                handleLetterFromPosition(evt.nativeEvent.pageY);
            },
            onPanResponderMove: (evt) => {
                handleLetterFromPosition(evt.nativeEvent.pageY);
            },
            onPanResponderRelease: () => {
                setIsActive(false);
                setCurrentLetter(null);
            },
            onPanResponderTerminate: () => {
                setIsActive(false);
                setCurrentLetter(null);
            },
        })
    ).current;

    if (!visible) return null;

    return (
        <View
            style={styles.container}
            ref={containerRef}
            onLayout={(e) => {
                containerLayout.current = {
                    y: e.nativeEvent.layout.y,
                    height: e.nativeEvent.layout.height,
                };
            }}
            {...panResponder.panHandlers}
        >
            {/* Current letter indicator bubble */}
            {isActive && currentLetter && (
                <View style={[styles.indicator, { backgroundColor: colors.primary }]}>
                    <Text style={styles.indicatorText}>{currentLetter}</Text>
                </View>
            )}

            {/* Letter list */}
            <View style={[styles.letterContainer, isActive && { backgroundColor: colors.surface + '80' }]}>
                {ALPHABET.map((letter) => {
                    const isActiveL = !activeLetters || activeLetters.includes(letter);
                    const isCurrent = letter === currentLetter;

                    return (
                        <View
                            key={letter}
                            style={[styles.letterItem, { height: letterHeight }]}
                        >
                            <Text
                                style={[
                                    styles.letter,
                                    { color: isActiveL ? colors.textSecondary : colors.textDisabled },
                                    isCurrent && { color: colors.primary, fontWeight: '700' },
                                ]}
                            >
                                {letter}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 0,
        top: 50,
        bottom: 100,
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    letterContainer: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: borderRadius.md,
    },
    letterItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    letter: {
        fontSize: 10,
        fontWeight: typography.weights.medium,
    },
    indicator: {
        position: 'absolute',
        left: -60,
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indicatorText: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        color: '#FFF',
    },
});

export default AlphabetScroller;
