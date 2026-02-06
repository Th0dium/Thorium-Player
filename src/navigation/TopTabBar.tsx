import React, { useRef, useState, useMemo } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TabConfig } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TopTabBarProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabPress: (tabId: any) => void;
    scrollX: Animated.Value;
}

const TopTabBar: React.FC<TopTabBarProps> = ({ tabs, activeTab, onTabPress, scrollX }) => {
    const { colors } = useTheme();
    const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH * 0.7); // Approximate initial width for faster first render

    // Calculate tab width based on container width
    const tabWidth = containerWidth / tabs.length;

    // We use useMemo for interpolation to avoid re-creating them on every render
    // scrollX goes from 0 to SCREEN_WIDTH * (tabs.length - 1)
    const translateX = useMemo(() => scrollX.interpolate({
        inputRange: tabs.map((_, i) => i * SCREEN_WIDTH),
        outputRange: tabs.map((_, i) => i * (containerWidth / tabs.length)),
        extrapolate: 'clamp',
    }), [tabs.length, containerWidth, scrollX]);

    return (
        <View 
            style={styles.tabBar} 
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            {tabs.map((tab, index) => {
                // Animate icon color via opacity for native driver support
                const opacity = scrollX.interpolate({
                    inputRange: [
                        (index - 1) * SCREEN_WIDTH,
                        index * SCREEN_WIDTH,
                        (index + 1) * SCREEN_WIDTH
                    ],
                    outputRange: [0.6, 1, 0.6],
                    extrapolate: 'clamp',
                });

                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tab}
                        onPress={() => onTabPress(tab.id)}
                        activeOpacity={0.7}
                    >
                        <Animated.View style={{ opacity }}>
                            <Icon
                                name={tab.icon}
                                size={24}
                                color={activeTab === tab.id ? colors.primary : colors.textSecondary}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                );
            })}

            {/* Animated Selection Indicator */}
            <Animated.View
                style={[
                    styles.indicator,
                    {
                        width: tabWidth,
                        backgroundColor: colors.primary,
                        transform: [{ translateX }],
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        height: '100%',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
});

export default TopTabBar;
