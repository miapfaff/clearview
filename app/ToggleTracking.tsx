import { useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity } from "react-native";

function ToggleSwitch() {
  const [isOn, setIsOn] = useState<boolean>(false);
  const knobPosition = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    Animated.timing(knobPosition, {
      toValue: newState ? 26 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={[styles.switch, isOn ? styles.on : styles.off]}
      onPress={toggle}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX: knobPosition }] }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  switch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    padding: 2,
  },
  on: {
    backgroundColor: '#4CAF50',
  },
  off: {
    backgroundColor: '#ccc',
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});

export default ToggleSwitch;