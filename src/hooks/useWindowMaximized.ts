import { useEffect, useState } from "react";
import { tauriWindow, tauriWindowReady } from "@/lib/tauriWindow";

export function useWindowMaximized() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const attach = () => {
      if (disposed || !tauriWindowReady()) return false;
      const win = tauriWindow();
      if (!win) return false;

      void win.isMaximized().then((value) => {
        if (!disposed) setIsMaximized(value);
      });

      void win.onResized(async () => {
        if (!disposed) setIsMaximized(await win.isMaximized());
      }).then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });

      return true;
    };

    if (!attach()) {
      const id = requestAnimationFrame(() => {
        attach();
      });
      return () => {
        disposed = true;
        cancelAnimationFrame(id);
        unlisten?.();
      };
    }

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return isMaximized;
}
