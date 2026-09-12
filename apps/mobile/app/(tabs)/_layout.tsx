import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/lib/theme";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: "SpaceMono",
        fontSize: 11,
        color: focused ? colors.moss : colors.inkMuted,
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: "SpaceMono", fontSize: 16 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.ink,
          borderTopWidth: 1.5,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.moss,
        tabBarInactiveTintColor: colors.inkMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "CarbonRoute",
          tabBarLabel: ({ focused }) => <TabLabel label="HOME" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log trip",
          tabBarLabel: ({ focused }) => <TabLabel label="LOG TRIP" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
