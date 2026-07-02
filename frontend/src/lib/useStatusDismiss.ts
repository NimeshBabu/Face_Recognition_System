import { useEffect } from "react";

/**
 * Auto-clears a status/toast message after a delay.
 *
 * @param status   - the current status string
 * @param setStatus - the setter to clear it
 * @param delayMs  - how long to show the message (default 4 seconds)
 */
export function useStatusDismiss(
  status: string,
  setStatus: (value: string) => void,
  delayMs = 4000,
) {
  useEffect(() => {
    if (!status) return;

    const timer = setTimeout(() => {
      setStatus("");
    }, delayMs);

    // Clean up if status changes before the timer fires
    return () => clearTimeout(timer);
  }, [status, setStatus, delayMs]);
}
