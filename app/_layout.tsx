import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { initDatabase } from "./db/alarmDb";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    // 앱이 시작될 때 DB 초기화를 시도합니다.
    const initializeDatabase = async () => {
      try {
        await initDatabase();
        setDbInitialized(true); // 초기화 성공
      } catch (error: any) {
        console.error("Failed to initialize database:", error);
        alert(`Failed to initialize database: ${error?.message ?? ""}`);
      }
    };

    initializeDatabase();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={styles.safeArea}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
      </SafeAreaView>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // ⭐️ 중요: 반드시 화면 전체를 차지하도록 설정
  },
});
