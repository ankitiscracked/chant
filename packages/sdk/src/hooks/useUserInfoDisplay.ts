import { useEffect, useState } from "react";
import { EventBus } from "../core/EventBus";
import type { UserInfoDisplayEvent } from "../types";

export function useUserInfoDisplay() {
  const [displayData, setDisplayData] = useState<UserInfoDisplayEvent | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleUserInfo = (event: CustomEvent<UserInfoDisplayEvent>) => {
      const { userInfo, resultText, error, actionId } = event.detail;
      // Only show UI if there's user info to display
      if (userInfo && userInfo.length > 0) {
        setDisplayData(event.detail);
        setIsVisible(true);
      }
    };

    EventBus.getInstance().addEventListener("userInfoDisplay", handleUserInfo);
    return () =>
      EventBus.getInstance().removeEventListener(
        "userInfoDisplay",
        handleUserInfo
      );
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    setTimeout(() => setDisplayData(null), 300); // Allow for animation
  };

  return { displayData, isVisible, dismiss };
}
