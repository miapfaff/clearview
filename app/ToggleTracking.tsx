import { useState } from "react";
import "./ToggleSwitch.css";

function ToggleSwitch() {
  const [isOn, setIsOn] = useState<boolean>(false);

  return (
    <div
      className={`switch ${isOn ? "on" : "off"}`}
      onClick={() => setIsOn(!isOn)}
    >
      <div className="knob" />
    </div>
  );
}

export default ToggleSwitch;