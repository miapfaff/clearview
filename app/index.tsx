import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  AppState,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "./App.css";
import ToggleSwitch from "./ToggleTracking";
import { styles } from "./indexStyles";
import { useTheme } from "./reverseContrast";

const MICRO_BREAK_LIBRARY = [
  {
    category: "Eyes",
    title: "20-20-20 Reset",
    duration: "20 sec",
    instructions: "Look at something 20 feet away for 20 seconds.",
  },
  {
    category: "Eyes",
    title: "Blink Refresh",
    duration: "30 sec",
    instructions: "Blink slowly 10 times to rehydrate your eyes.",
  },
  {
    category: "Neck",
    title: "Neck Release",
    duration: "45 sec",
    instructions: "Gently roll your neck in small circles, both directions.",
  },
  {
    category: "Posture",
    title: "Shoulder Drop",
    duration: "30 sec",
    instructions: "Raise shoulders to ears, hold, then release slowly.",
  },
  {
    category: "Posture",
    title: "Posture Reset",
    duration: "40 sec",
    instructions: "Sit tall, relax jaw, and align ears over shoulders.",
  },
];

export default function Index() {
  const { theme, reverseContrastEnabled, toggleTheme } = useTheme();
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [lastDate, setLastDate] = useState(new Date().toDateString());
  const [appState, setAppState] = useState(AppState.currentState);
  const [countdown, setCountdown] = useState(1200); // 20 minutes in seconds
  const [activeTab, setActiveTab] = useState<
    "home" | "stats" | "breaks" | "settings"
  >("home");
  const [breaksTakenToday, setBreaksTakenToday] = useState(0);
  const [reminderMinutes, setReminderMinutes] = useState(20);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [weeklyTrackingEnabled, setWeeklyTrackingEnabled] = useState(false);
  const [microBreakIndex, setMicroBreakIndex] = useState(0);
  const [microBreakCategoryFilter, setMicroBreakCategoryFilter] = useState<
    "All" | "Eyes" | "Neck" | "Posture"
  >("All");
  const [weeklyData, setWeeklyData] = useState<
    { date: string; screenTime: number; breaks: number; risk: string }[]
  >([]);

  useEffect(() => {
    const loadData = async () => {
      const storedDate = await AsyncStorage.getItem("lastDate");
      const storedSeconds = await AsyncStorage.getItem("totalSeconds");
      const storedBreaks = await AsyncStorage.getItem("breaksTakenToday");
      const storedReminderMinutes =
        await AsyncStorage.getItem("reminderMinutes");
      const storedRemindersEnabled =
        await AsyncStorage.getItem("remindersEnabled");
      const storedWeeklyTrackingEnabled = await AsyncStorage.getItem(
        "weeklyTrackingEnabled",
      );
      const storedWeeklyData = await AsyncStorage.getItem("weeklyData");
      const currentDate = new Date().toDateString();
      const parsedReminderMinutes = storedReminderMinutes
        ? parseInt(storedReminderMinutes, 10)
        : 20;
      const safeReminderMinutes =
        Number.isNaN(parsedReminderMinutes) || parsedReminderMinutes < 5
          ? 20
          : parsedReminderMinutes;
      const reminderFlag = storedRemindersEnabled === "false" ? false : true;
      const weeklyTrackingFlag = storedWeeklyTrackingEnabled === "true";
      const safeWeeklyData = storedWeeklyData
        ? JSON.parse(storedWeeklyData)
        : [];

      setReminderMinutes(safeReminderMinutes);
      setRemindersEnabled(reminderFlag);
      setWeeklyTrackingEnabled(weeklyTrackingFlag);
      setWeeklyData(safeWeeklyData);
      setCountdown(reminderFlag ? safeReminderMinutes * 60 : 0);

      if (storedDate === currentDate && storedSeconds) {
        setTotalSeconds(parseInt(storedSeconds, 10));
        setBreaksTakenToday(storedBreaks ? parseInt(storedBreaks, 10) : 0);
      } else {
        if (weeklyTrackingFlag && storedDate && storedSeconds) {
          const previousBreaks = storedBreaks ? parseInt(storedBreaks, 10) : 0;
          const previousRisk = calculateRiskLevel(
            parseInt(storedSeconds, 10),
            previousBreaks,
            safeReminderMinutes,
          );
          const nextWeeklyData = [
            ...safeWeeklyData,
            {
              date: storedDate,
              screenTime: parseInt(storedSeconds, 10),
              breaks: previousBreaks,
              risk: previousRisk,
            },
          ].slice(-7);
          setWeeklyData(nextWeeklyData);
          await AsyncStorage.setItem(
            "weeklyData",
            JSON.stringify(nextWeeklyData),
          );
        }
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
          if (weeklyTrackingEnabled) {
            const nextWeeklyData = [
              ...weeklyData,
              {
                date: lastDate,
                screenTime: totalSeconds,
                breaks: breaksTakenToday,
                risk: calculateRiskLevel(
                  totalSeconds,
                  breaksTakenToday,
                  reminderMinutes,
                ),
              },
            ].slice(-7);
            setWeeklyData(nextWeeklyData);
            await AsyncStorage.setItem(
              "weeklyData",
              JSON.stringify(nextWeeklyData),
            );
          }
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
  }, [
    lastDate,
    weeklyTrackingEnabled,
    weeklyData,
    totalSeconds,
    breaksTakenToday,
    reminderMinutes,
  ]);

  useEffect(() => {
    let interval: number | null = null;

    if (appState === "active" && remindersEnabled) {
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
  }, [appState, lastDate, remindersEnabled]);

  useEffect(() => {
    if (!remindersEnabled) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1){
          AccessibilityInfo.announceForAccessibility("Time for a break");
          return reminderMinutes * 60;
        }
        return (prev > 0 ? prev - 1 : reminderMinutes * 60);
    });
  }, 1000);
    return () => clearInterval(interval);
  }, [reminderMinutes, remindersEnabled]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateRiskLevel = (
    screenTime: number,
    breaks: number,
    reminderInterval: number,
  ) => {
    if (screenTime === 0) return "Low";
    const expectedBreaks = Math.max(
      1,
      Math.floor(screenTime / (reminderInterval * 60)),
    );
    const ratio = breaks / expectedBreaks;

    if (screenTime < 3600 && ratio >= 0.8) return "Low";
    if (screenTime < 10800 && ratio >= 0.5) return "Moderate";
    return "High";
  };

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  const handleTakeBreak = () => {
    AccessibilityInfo.announceForAccessibility(
      `Break logged. Next reminder in ${reminderMinutes} minutes`
    );
    if (remindersEnabled) {
      setCountdown(reminderMinutes * 60);
    }
    setBreaksTakenToday((prev) => {
      const updatedBreaks = prev + 1;
      AsyncStorage.setItem("breaksTakenToday", updatedBreaks.toString());
      return updatedBreaks;
    });
    setMicroBreakIndex((prev) => {
      const list =
        microBreakCategoryFilter === "All"
          ? MICRO_BREAK_LIBRARY
          : MICRO_BREAK_LIBRARY.filter(
              (microBreak) => microBreak.category === microBreakCategoryFilter,
            );
      return (prev + 1) % list.length;
    });
  };

  const rotateMicroBreak = () => {
    setMicroBreakIndex((prev) => {
      const list =
        microBreakCategoryFilter === "All"
          ? MICRO_BREAK_LIBRARY
          : MICRO_BREAK_LIBRARY.filter(
              (microBreak) => microBreak.category === microBreakCategoryFilter,
            );
      return (prev + 1) % list.length;
    });
    AccessibilityInfo.announceForAccessibility("Showing another micro-break");
  };

  const filteredMicroBreaks =
    microBreakCategoryFilter === "All"
      ? MICRO_BREAK_LIBRARY
      : MICRO_BREAK_LIBRARY.filter(
          (microBreak) => microBreak.category === microBreakCategoryFilter,
        );
  const selectedMicroBreak = filteredMicroBreaks[microBreakIndex] ?? filteredMicroBreaks[0];

  useEffect(() => {
    setMicroBreakIndex(0);
  }, [microBreakCategoryFilter]);

  const expectedBreaks = Math.max(
    1,
    Math.floor(totalSeconds / (reminderMinutes * 60)),
  );

  const getEyeStrainRiskLevel = () =>
    calculateRiskLevel(totalSeconds, breaksTakenToday, reminderMinutes);

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
    setRemindersEnabled(true);
    AsyncStorage.setItem("reminderMinutes", boundedValue.toString());
    AsyncStorage.setItem("remindersEnabled", "true");
    AccessibilityInfo.announceForAccessibility(`Reminder updated to ${boundedValue} minutes`);
    Alert.alert(
      "Reminder Updated",
      `Break reminder is now every ${boundedValue} minutes.`,
    );
  };

  const toggleWeeklyTracking = async (enabled: boolean) => {
    setWeeklyTrackingEnabled(enabled);

    AccessibilityInfo.announceForAccessibility(
      enabled
        ? "Weekly tracking enabled"
        : "Weekly tracking disabled"
    );

    await AsyncStorage.setItem(
      "weeklyTrackingEnabled",
      JSON.stringify(enabled),
    );
  };

  const toggleRemindersEnabled = async (enabled: boolean) => {
    setRemindersEnabled(enabled);

    AccessibilityInfo.announceForAccessibility(
      enabled
        ? "Break reminders enabled"
        : "Break reminders disabled"
    );

    await AsyncStorage.setItem("remindersEnabled", JSON.stringify(enabled));
    if (enabled) {
      setCountdown(reminderMinutes * 60);
    } else {
      setCountdown(0);
    }
  };

  const deleteCurrentReminder = async () => {
    setRemindersEnabled(false);
    setReminderMinutes(20);
    setCountdown(0);

    AccessibilityInfo.announceForAccessibility(
      "Break reminder deleted"
    );

    await AsyncStorage.removeItem("reminderMinutes");
    await AsyncStorage.setItem("remindersEnabled", "false");
    Alert.alert(
      "Reminder deleted",
      "Your current break reminder has been removed.",
    );
  };

  useEffect(() => {
    if (!remindersEnabled) {
      setCountdown(0);
    }
  }, [remindersEnabled]);

  const confirmDeleteReminder = () => {
    Alert.alert(
      "Delete reminder?",
      "This will remove your current break reminder schedule.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: deleteCurrentReminder,
        },
      ],
    );
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
            const keysToClear = [
              "lastDate",
              "totalSeconds",
              "breaksTakenToday",
              "reminderMinutes",
              "remindersEnabled",
              "weeklyTrackingEnabled",
              "weeklyData",
            ];
            await Promise.all(
              keysToClear.map((key) => AsyncStorage.removeItem(key)),
            );
            const currentDate = new Date().toDateString();
            setLastDate(currentDate);
            setTotalSeconds(0);
            setBreaksTakenToday(0);
            setReminderMinutes(20);
            setCountdown(20 * 60);

            AccessibilityInfo.announceForAccessibility(
              "All local data has been cleared"
            );
          },
        },
      ],
    );
  };

  const renderHomeTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={[styles.title, { color: theme.text }]}>ClearView</Text>
      <Text style={[styles.subtitle, { color: theme.subtext }]}>Reduce eye strain from phone use</Text>

      <View style={styles.privacyBanner}>
        <Text style={styles.privacyBannerTitle}>
          Privacy-first mode is enabled
        </Text>
        <Text style={styles.privacyBannerText}>
          No account. No location. Your data stays on this device.
        </Text>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Screen Time Today</Text>
        <Text style={[styles.timeText, { color: theme.tabTitle }]}
            accessible={true}
            accessibilityLabel={`Screen time today is ${hours} hours and ${mins} minutes`}
        >
          {hours}h {mins}m
        </Text>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Next Break Reminder</Text>
        <Text style={[styles.timeText, { color: theme.tabTitle }]}
          accessible={true}
          accessibilityLabel={
            remindersEnabled
              ? `Next break in ${Math.floor(countdown / 60)} minutes and ${countdown % 60} seconds`
              : "Break reminders are off"
          }
        >
          {remindersEnabled ? formatTime(countdown) : "Off"}
        </Text>
        <Text style={[styles.helperText, { color: theme.subtext }]}>
          {remindersEnabled
            ? `Interval: every ${reminderMinutes} minutes`
            : "Break reminders are turned off."}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleTakeBreak}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Log break"
          accessibilityHint="Records that you are taking a break now"
        >
          <Text style={styles.primaryButtonText}>Log Break Now</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Eye Strain Feedback</Text>
        <Text style={[styles.riskText, { color: riskColor }]}
          accessibilityRole="text"
          accessibilityLabel={`Eye strain risk level is ${eyeStrainRisk}`}
        >
          Risk Level: {eyeStrainRisk}
        </Text>
        <Text style={[styles.helperText, { color: theme.subtext }]}>
          Breaks taken: {breaksTakenToday} / {expectedBreaks} expected today
        </Text>
      </View>
    </ScrollView>
  );

  const weeklyTotalSeconds = weeklyData.reduce(
    (sum, entry) => sum + entry.screenTime,
    0,
  );
  const weeklyTotalBreaks = weeklyData.reduce(
    (sum, entry) => sum + entry.breaks,
    0,
  );
  const weeklyHours = Math.floor(weeklyTotalSeconds / 3600);
  const weeklyMins = Math.floor((weeklyTotalSeconds % 3600) / 60);
  const chartMax = Math.max(
    ...weeklyData.map((entry) => entry.screenTime / 3600),
    1,
  );

  const renderStatsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.tabTitle }]}>Today&apos;s Stats</Text>
      <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
        <Text style={[styles.statLabel, { color: theme.subtext }]}>Total Screen Time</Text>
        <Text style={[styles.statValue, { color: theme.text }]}
          accessible={true}
          accessibilityLabel={`Total screen time is ${hours} hours and ${mins} minutes`}
        >
          {hours}h {mins}m
        </Text>
      </View>
      <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
        <Text style={[styles.statLabel, { color: theme.subtext }]}>Breaks Taken</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{breaksTakenToday}</Text>
      </View>
      <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
        <Text style={[styles.statLabel, { color: theme.subtext }]}>Eye Strain Risk</Text>
        <Text style={[styles.statValue, { color: riskColor }]}>
          {eyeStrainRisk}
        </Text>
      </View>

      <Text style={[styles.tabTitle, { marginTop: 18 }, { color: theme.tabTitle }]}>Weekly Overview</Text>
      <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
        <Text style={[styles.statLabel, { color: theme.subtext }]}>Last 7 Days</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>
          {weeklyHours}h {weeklyMins}m
        </Text>
        <Text style={[styles.helperText, { color: theme.subtext }]}>
          {weeklyTotalBreaks} breaks this week
        </Text>
      </View>

      {weeklyData.length > 0 ? (
        <View style={styles.weeklyChartCard}>
          <View style={styles.weeklyChartRow}>
            {weeklyData.map((entry) => {
              const height = Math.max(
                12,
                (entry.screenTime / 3600 / chartMax) * 120,
              );
              return (
                <View key={entry.date} style={styles.weeklyBarWrapper}>
                  <View style={[styles.weeklyBar, { height }]} />
                  <Text style={styles.weeklyBarLabel}>
                    {entry.date.slice(0, 3)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[styles.statBlock, { backgroundColor: theme.card }
        ]}>
          <Text style={[styles.helperText, { color: theme.subtext }]}>
            Enable weekly tracking and use the app daily to build your weekly
            chart.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderBreaksTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.tabTitle }]}>Break Feedback</Text>
      <Text style={[styles.paragraph, { color: theme.text }]}>
        You have taken {breaksTakenToday} breaks today. Based on your reminder
        setting ({reminderMinutes} min), your goal is {expectedBreaks} breaks.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleTakeBreak}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Log Another Break"
        accessibilityHint="Records that you are taking a break now"
      >
        <Text style={styles.primaryButtonText}>Log Another Break</Text>
      </TouchableOpacity>
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Micro-Break Library</Text>
        <View style={styles.filterRow}>
          {(["All", "Eyes", "Neck", "Posture"] as const).map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                microBreakCategoryFilter === category && styles.filterChipActive,
              ]}
              onPress={() => {
                setMicroBreakCategoryFilter(category);
                AccessibilityInfo.announceForAccessibility(
                  `${category} micro-break filter selected`,
                );
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  microBreakCategoryFilter === category && styles.filterChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.tipText}>
          {selectedMicroBreak.title} ({selectedMicroBreak.duration})
        </Text>
        <Text style={[styles.paragraph, { marginBottom: 0 }]}>
          {selectedMicroBreak.instructions}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={rotateMicroBreak}>
          <Text style={styles.primaryButtonText}>Show Another Micro-Break</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Optional Eye Relief Ideas</Text>
        <Text style={styles.tipText}>
          - Look away from screen for 20 seconds
        </Text>
        <Text style={styles.tipText}>- Blink slowly 10 times</Text>
        <Text style={styles.tipText}>- Relax shoulders and neck</Text>
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.tabTitle }]}>Comfort Settings</Text>
      <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
        <View>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Weekly Tracking</Text>
          <Text style={[styles.settingSubtitle, { color: theme.subtext }]}>
            Save your screen time and breaks over 7 days.
          </Text>
        </View>
        <ToggleSwitch
          isOn={weeklyTrackingEnabled}
          onToggle={toggleWeeklyTracking}
          label="Weekly Tracking"
        />
      </View>
      <View style={[styles.settingCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>Font Size</Text>
        <Text style={[styles.settingSubtitle, { color: theme.subtext }]}>Increase text size for lower sighted individuals.</Text>
      </View>
      <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
        <View>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Reverse Contrast</Text>
          <Text style={[styles.settingSubtitle, { color: theme.subtext }]}>
            Inverts colors for dark environments.
          </Text>
        </View>
        <ToggleSwitch
          isOn={reverseContrastEnabled}
          onToggle={toggleTheme}
          label="Reverse Contrast"
        />
      </View>
      <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
        <View>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Break Reminder</Text>
          <Text style={[styles.settingSubtitle, { color: theme.subtext }]}>
            {remindersEnabled
              ? `Every ${reminderMinutes} minutes`
              : "No reminder is currently active."}
          </Text>
        </View>
        <ToggleSwitch
          isOn={remindersEnabled}
          onToggle={toggleRemindersEnabled}
          label="Break Reminders"
        />
      </View>
      <View style={[styles.settingCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>Reminder Schedule</Text>
        <Text style={[styles.settingSubtitle, { color: theme.subtext }]}>
          {remindersEnabled
            ? "Adjust your current alarm interval."
            : "Enable reminders to restore a schedule."}
        </Text>
        {remindersEnabled ? (
          <View style={styles.reminderControls}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => updateReminderMinutes(reminderMinutes - 5)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Subtract five minutes from break"
              accessibilityHint="Breaks occur five minutes shorter than before"
            >
              <Text style={styles.adjustButtonText}>- 5m</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => updateReminderMinutes(reminderMinutes + 5)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add five minutes to break"
              accessibilityHint="Breaks occur five minutes longer than before"
            >
              <Text style={styles.adjustButtonText}>+ 5m</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.dangerButton, { marginTop: 14 }]}
          onPress={confirmDeleteReminder}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Delete Reminder"
          accessibilityHint="Deletes current break reminder"
        >
          <Text style={styles.dangerButtonText}>Delete Reminder</Text>
        </TouchableOpacity>
      </View>
      {/* <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
      <View>
        <Text style={styles.settingTitle}>Reverse Contrast</Text>
        <Text style={styles.settingSubtitle}>
          Inverts colors for dark environments.
        </Text>
      </View>
      <ToggleSwitch
        isOn={reverseContrastEnabled}
        onToggle={toggleTheme}
        label="Reverse Contrast"
      />
    </View> */}
      <View style={[styles.settingCard, { backgroundColor: theme.card }]}>
        <Text style={styles.settingTitle}>Privacy</Text>
        <Text style={styles.settingSubtitle}>
          ClearView stores data locally only. Nothing is shared to a server.
        </Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={clearAllLocalData}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Clear All Local Data"
          accessibilityHint="All local data is deleted"
        >
          <Text style={styles.dangerButtonText}>Clear All Local Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    if (activeTab === "home") return renderHomeTab();
    if (activeTab === "stats") return renderStatsTab();
    if (activeTab === "breaks") return renderBreaksTab();
    return renderSettingsTab();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>      
    <View style={styles.mainContent}>{renderTabContent()}</View>
      <View style={[styles.navBar, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeTab === "home" && styles.navButtonActive,
          ]}
          onPress={() => setActiveTab("home")}
          accessible={true}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "home" }}
          accessibilityLabel="Home"
          accessibilityHint="Return to home screen"
        >
          <Text
            style={[
              styles.navText,
              { color: activeTab === "home" ? theme.accent : theme.subtext },
              activeTab === "home" && styles.navTextActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeTab === "stats" && styles.navButtonActive,
          ]}
          onPress={() => setActiveTab("stats")}
          accessible={true}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "stats" }}
          accessibilityLabel="Stats"
          accessibilityHint="Go to statistics page"
        >
          <Text
            style={[
              styles.navText,
              { color: activeTab === "stats" ? theme.accent : theme.subtext },
              activeTab === "stats" && styles.navTextActive,
            ]}
          >
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeTab === "breaks" && styles.navButtonActive,
          ]}
          onPress={() => setActiveTab("breaks")}
          accessible={true}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "breaks" }}
          accessibilityLabel="Breaks"
          accessibilityHint="Go to breaks page"
        >
          <Text
            style={[
              styles.navText,
              { color: activeTab === "breaks" ? theme.accent : theme.subtext },
              activeTab === "breaks" && styles.navTextActive,
            ]}
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
          accessible={true}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "settings" }}
          accessibilityLabel="Settings"
          accessibilityHint="Go to settings page"
        >
          <Text
            style={[
              styles.navText,
              { color: activeTab === "settings" ? theme.accent : theme.subtext },
              activeTab === "settings" && styles.navTextActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

