import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity } from "react-native";

type ToggleSwitchProps = {
  isOn?: boolean;
  onToggle?: (nextValue: boolean) => void;
};

function ToggleSwitch({ isOn, onToggle }: ToggleSwitchProps) {
  const [internalIsOn, setInternalIsOn] = useState<boolean>(false);
  const currentIsOn = isOn ?? internalIsOn;
  const knobPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(knobPosition, {
      toValue: currentIsOn ? 26 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [currentIsOn, knobPosition]);

  const toggle = () => {
    const newState = !currentIsOn;
    if (onToggle) {
      onToggle(newState);
    } else {
      setInternalIsOn(newState);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.switch, currentIsOn ? styles.on : styles.off]}
      onPress={toggle}
    >
      <Animated.View
        style={[styles.knob, { transform: [{ translateX: knobPosition }] }]}
      />
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