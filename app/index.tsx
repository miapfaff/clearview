import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "./App.css";
import ToggleSwitch from "./ToggleTracking";

export default function Index() {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [lastDate, setLastDate] = useState(new Date().toDateString());
  const [appState, setAppState] = useState(AppState.currentState);
  const [countdown, setCountdown] = useState(1200); // 20 minutes in seconds
  const [activeTab, setActiveTab] = useState<
    "home" | "stats" | "breaks" | "settings"
  >("home");
  const [breaksTakenToday, setBreaksTakenToday] = useState(0);
  const [reminderMinutes, setReminderMinutes] = useState(20);
  const [weeklyTrackingEnabled, setWeeklyTrackingEnabled] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const storedDate = await AsyncStorage.getItem("lastDate");
      const storedSeconds = await AsyncStorage.getItem("totalSeconds");
      const storedBreaks = await AsyncStorage.getItem("breaksTakenToday");
      const storedReminderMinutes = await AsyncStorage.getItem("reminderMinutes");
      const currentDate = new Date().toDateString();
      const parsedReminderMinutes = storedReminderMinutes
        ? parseInt(storedReminderMinutes, 10)
        : 20;
      const safeReminderMinutes =
        Number.isNaN(parsedReminderMinutes) || parsedReminderMinutes < 5
          ? 20
          : parsedReminderMinutes;

      setReminderMinutes(safeReminderMinutes);
      setCountdown(safeReminderMinutes * 60);

      if (storedDate === currentDate && storedSeconds) {
        setTotalSeconds(parseInt(storedSeconds, 10));
        setBreaksTakenToday(storedBreaks ? parseInt(storedBreaks, 10) : 0);
      } else {
        // New day, reset
        setTotalSeconds(0);
        setBreaksTakenToday(0);
        await AsyncStorage.setItem("lastDate", currentDate);
        await AsyncStorage.setItem("totalSeconds", "0");
        await AsyncStorage.setItem("breaksTakenToday", "0");
      }
      setLastDate(currentDate);
    };

    loadData();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        const currentDate = new Date().toDateString();
        if (currentDate !== lastDate) {
          // New day
          setTotalSeconds(0);
          setBreaksTakenToday(0);
          setLastDate(currentDate);
          await AsyncStorage.setItem("lastDate", currentDate);
          await AsyncStorage.setItem("totalSeconds", "0");
          await AsyncStorage.setItem("breaksTakenToday", "0");
        }

        setAppState(nextAppState);
      },
    );

    return () => subscription?.remove();
  }, [lastDate]);

  useEffect(() => {
    let interval: number | null = null;

    if (appState === "active") {
      // @ts-ignore
      interval = setInterval(async () => {
        const currentDate = new Date().toDateString();
        if (currentDate !== lastDate) {
          // New day while active
          setTotalSeconds(0);
          setBreaksTakenToday(0);
          setLastDate(currentDate);
          await AsyncStorage.setItem("lastDate", currentDate);
          await AsyncStorage.setItem("totalSeconds", "0");
          await AsyncStorage.setItem("breaksTakenToday", "0");
        } else {
          setTotalSeconds((prev) => {
            const newTotal = prev + 1;
            AsyncStorage.setItem("totalSeconds", newTotal.toString());
            return newTotal;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [appState, lastDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : reminderMinutes * 60));
    }, 1000);
    return () => clearInterval(interval);
  }, [reminderMinutes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  const handleTakeBreak = () => {
    setCountdown(reminderMinutes * 60);
    setBreaksTakenToday((prev) => {
      const updatedBreaks = prev + 1;
      AsyncStorage.setItem("breaksTakenToday", updatedBreaks.toString());
      return updatedBreaks;
    });
  };

  const expectedBreaks = Math.max(1, Math.floor(totalSeconds / (reminderMinutes * 60)));
  const breakCompletionRatio = breaksTakenToday / expectedBreaks;

  const getEyeStrainRiskLevel = () => {
    if (totalSeconds < 3600 && breakCompletionRatio >= 0.8) return "Low";
    if (totalSeconds < 10800 && breakCompletionRatio >= 0.5) return "Moderate";
    return "High";
  };

  const eyeStrainRisk = getEyeStrainRiskLevel();
  const riskColor =
    eyeStrainRisk === "Low"
      ? "#2E7D32"
      : eyeStrainRisk === "Moderate"
        ? "#B26A00"
        : "#C62828";

        const updateReminderMinutes = (nextValue: number) => {
          const boundedValue = Math.max(5, Math.min(60, nextValue));
          setReminderMinutes(boundedValue);
          setCountdown(boundedValue * 60);
          AsyncStorage.setItem("reminderMinutes", boundedValue.toString());
          Alert.alert("Reminder Updated", `Break reminder is now every ${boundedValue} minutes.`);
        };

  const clearAllLocalData = () => {
    Alert.alert(
      "Clear local data?",
      "This will erase your screen time, breaks, and preferences stored on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "lastDate",
              "totalSeconds",
              "breaksTakenToday",
              "reminderMinutes",
            ]);
            const currentDate = new Date().toDateString();
            setLastDate(currentDate);
            setTotalSeconds(0);
            setBreaksTakenToday(0);
            setReminderMinutes(20);
            setCountdown(20 * 60);
          },
        },
      ],
    );
  };

  const renderHomeTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.title}>ClearView</Text>
      <Text style={styles.subtitle}>Reduce eye strain from phone use</Text>

      <View style={styles.privacyBanner}>
        <Text style={styles.privacyBannerTitle}>Privacy-first mode is enabled</Text>
        <Text style={styles.privacyBannerText}>
          No account. No location. Your data stays on this device.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Screen Time Today</Text>
        <Text style={styles.timeText}>
          {hours}h {mins}m
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Next Break Reminder</Text>
        <Text style={styles.timeText}>{formatTime(countdown)}</Text>
        <Text style={styles.helperText}>
          Interval: every {reminderMinutes} minutes
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleTakeBreak}>
          <Text style={styles.primaryButtonText}>Log Break Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Daily Eye Strain Feedback</Text>
        <Text style={[styles.riskText, { color: riskColor }]}>
          Risk Level: {eyeStrainRisk}
        </Text>
        <Text style={styles.helperText}>
          Breaks taken: {breaksTakenToday} / {expectedBreaks} expected today
        </Text>
      </View>
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Today&apos;s Stats</Text>
      <View style={styles.statBlock}>
        <Text style={styles.statLabel}>Total Screen Time</Text>
        <Text style={styles.statValue}>
          {hours}h {mins}m
        </Text>
      </View>
      <View style={styles.statBlock}>
        <Text style={styles.statLabel}>Breaks Taken</Text>
        <Text style={styles.statValue}>{breaksTakenToday}</Text>
      </View>
      <View style={styles.statBlock}>
        <Text style={styles.statLabel}>Eye Strain Risk</Text>
        <Text style={[styles.statValue, { color: riskColor }]}>{eyeStrainRisk}</Text>
      </View>
    </View>
  );

  const renderBreaksTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Break Feedback</Text>
      <Text style={styles.paragraph}>
        You have taken {breaksTakenToday} breaks today. Based on your reminder
        setting ({reminderMinutes} min), your goal is {expectedBreaks} breaks.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleTakeBreak}>
        <Text style={styles.primaryButtonText}>Log Another Break</Text>
      </TouchableOpacity>
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Optional Eye Relief Ideas</Text>
        <Text style={styles.tipText}>- Look away from screen for 20 seconds</Text>
        <Text style={styles.tipText}>- Blink slowly 10 times</Text>
        <Text style={styles.tipText}>- Relax shoulders and neck</Text>
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Comfort Settings</Text>
      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingTitle}>Weekly Tracking</Text>
          <Text style={styles.settingSubtitle}>
            Save your screen time and breaks over 7 days.
          </Text>
        </View>
        <ToggleSwitch
          isOn={weeklyTrackingEnabled}
          onToggle={setWeeklyTrackingEnabled}
        />
      </View>
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Display Preset</Text>
        <Text style={styles.settingSubtitle}>Large text and high contrast</Text>
      </View>
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Break Reminder</Text>
        <Text style={styles.settingSubtitle}>Every {reminderMinutes} minutes</Text>
        <View style={styles.reminderControls}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => updateReminderMinutes(reminderMinutes - 5)}
          >
            <Text style={styles.adjustButtonText}>- 5m</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => updateReminderMinutes(reminderMinutes + 5)}
          >
            <Text style={styles.adjustButtonText}>+ 5m</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Privacy</Text>
        <Text style={styles.settingSubtitle}>
          ClearView stores data locally only. Nothing is shared to a server.
        </Text>
        <TouchableOpacity style={styles.dangerButton} onPress={clearAllLocalData}>
          <Text style={styles.dangerButtonText}>Clear All Local Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === "home") return renderHomeTab();
    if (activeTab === "stats") return renderStatsTab();
    if (activeTab === "breaks") return renderBreaksTab();
    return renderSettingsTab();
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>{renderTabContent()}</View>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === "home" && styles.navButtonActive]}
          onPress={() => setActiveTab("home")}
        >
          <Text style={[styles.navText, activeTab === "home" && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeTab === "stats" && styles.navButtonActive]}
          onPress={() => setActiveTab("stats")}
        >
          <Text
            style={[styles.navText, activeTab === "stats" && styles.navTextActive]}
          >
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeTab === "breaks" && styles.navButtonActive]}
          onPress={() => setActiveTab("breaks")}
        >
          <Text
            style={[styles.navText, activeTab === "breaks" && styles.navTextActive]}
          >
            Breaks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeTab === "settings" && styles.navButtonActive,
          ]}
          onPress={() => setActiveTab("settings")}
        >
          <Text
            style={[styles.navText, activeTab === "settings" && styles.navTextActive]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#132238",
  },
  subtitle: {
    fontSize: 18,
    color: "#31435F",
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D6E0F2",
  },
  privacyBanner: {
    backgroundColor: "#EAF6EE",
    borderWidth: 1,
    borderColor: "#B7DEC2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  privacyBannerTitle: {
    color: "#1D5E31",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  privacyBannerText: {
    color: "#2A6A3D",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1E2D45",
  },
  timeText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#0E4E9B",
  },
  primaryButton: {
    backgroundColor: "#0E4E9B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    marginTop: 8,
    color: "#334767",
    fontSize: 15,
  },
  riskText: {
    fontSize: 24,
    fontWeight: "700",
  },
  tabContent: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  tabTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 14,
    color: "#132238",
  },
  statBlock: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E0F2",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 16,
    color: "#344763",
  },
  statValue: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#0E4E9B",
    marginTop: 6,
  },
  paragraph: {
    fontSize: 17,
    color: "#334767",
    lineHeight: 24,
    marginBottom: 14,
  },
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E0F2",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E2D45",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 16,
    color: "#334767",
    marginBottom: 4,
  },
  settingRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E0F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  settingCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E0F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E2D45",
  },
  settingSubtitle: {
    fontSize: 15,
    color: "#334767",
    marginTop: 4,
  },
  reminderControls: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  adjustButton: {
    backgroundColor: "#E6F0FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  adjustButtonText: {
    color: "#0E4E9B",
    fontWeight: "700",
  },
  dangerButton: {
    marginTop: 12,
    backgroundColor: "#FEECEC",
    borderWidth: 1,
    borderColor: "#F3BABA",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  dangerButtonText: {
    color: "#A61B1B",
    fontWeight: "700",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1.5,
    borderTopColor: "#C8D7EF",
    backgroundColor: "#FFFFFF",
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navButtonActive: {
    backgroundColor: "#E6F0FF",
  },
  navText: {
    fontSize: 16,
    color: "#31435F",
    fontWeight: "600",
  },
  navTextActive: {
    color: "#0E4E9B",
  },
});
