import React, { useEffect, useState } from "react";

/**
 * Overlay component: displays a solid white overlay that fades out to transparent over 500ms.
 */
export default function Overlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
    }, 10); // Start fade almost immediately
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "white",
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
        transition: "opacity 1000ms ease",
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
