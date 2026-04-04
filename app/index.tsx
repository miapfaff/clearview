import { Text, View } from "react-native";
import "./App.css";
import ToggleSwitch from "./ToggleTracking";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1 className="title">ClearView</h1>
      <hr className="section-divider" />
      <Text>Screen Time Today</Text>
      <hr className="section-divider" />
      <Text>Next Break</Text>
      <br></br>
      <button>All Alarms</button>
      <hr className="section-divider" />
      <Text>Tracking</Text>
      <br></br>
      <ToggleSwitch />
      <hr className="section-divider" />
      <Text>Settings and Customization</Text>
    </View>
  );
}
