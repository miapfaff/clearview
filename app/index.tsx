import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
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
  const [countdown, setCountdown] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    const loadData = async () => {
      const storedDate = await AsyncStorage.getItem("lastDate");
      const storedSeconds = await AsyncStorage.getItem("totalSeconds");
      const currentDate = new Date().toDateString();

      if (storedDate === currentDate && storedSeconds) {
        setTotalSeconds(parseInt(storedSeconds));
      } else {
        // New day, reset
        setTotalSeconds(0);
        await AsyncStorage.setItem("lastDate", currentDate);
        await AsyncStorage.setItem("totalSeconds", "0");
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
          setLastDate(currentDate);
          await AsyncStorage.setItem("lastDate", currentDate);
          await AsyncStorage.setItem("totalSeconds", "0");
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
          setLastDate(currentDate);
          await AsyncStorage.setItem("lastDate", currentDate);
          await AsyncStorage.setItem("totalSeconds", "0");
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
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  const handleTakeBreak = () => {
    // Reset countdown or navigate to break screen
    setCountdown(900);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <Text style={styles.title}>ClearView</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Time Today</Text>
          <Text style={styles.timeText}>
            {hours}h {mins}m
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Break</Text>
          <Text style={styles.timeText}>{formatTime(countdown)}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleTakeBreak}>
          <Text style={styles.buttonText}>Take Break Now</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomSection}>
        <View style={styles.toggleSection}>
          <Text style={styles.toggleLabel}>Weekly Tracking</Text>
          <ToggleSwitch />
        </View>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navText}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navText}>Breaks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  section: {
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  timeText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSection: {
    paddingBottom: 20,
  },
  toggleSection: {
    alignItems: "center",
    marginBottom: 10,
  },
  toggleLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  navButton: {
    padding: 10,
  },
  navText: {
    fontSize: 16,
  },
});
