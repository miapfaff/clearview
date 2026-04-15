import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export const lightTheme = {
    background: "#F4F8FF",
    card: "#FFFFFF",
    text: "#132238",
    subtext: "#334767",
    accent: "#0E4E9B",
    tabTitle: "#0E4E9B",
  };
  
  export const darkTheme = {
    background: "#000000",
    card: "#1C1C1E",
    text: "#FFFFFF",
    subtext: "#CCCCCC",
    accent: "#4DA3FF",
    tabTitle: "#7DB8FF",
  };

export const useTheme = () => {
  const [reverseContrastEnabled, setReverseContrastEnabled] =
    useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem("reverseContrast");
      setReverseContrastEnabled(stored === "true");
    };
    loadTheme();
  }, []);

  const toggleTheme = async (enabled: boolean) => {
    setReverseContrastEnabled(enabled);
    await AsyncStorage.setItem("reverseContrast", JSON.stringify(enabled));
  };

  const theme = reverseContrastEnabled ? darkTheme : lightTheme;

  return {
    theme,
    reverseContrastEnabled,
    toggleTheme,
  };
};