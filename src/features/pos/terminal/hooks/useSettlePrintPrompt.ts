import { useCallback, useEffect, useRef, useState } from "react";
import { decideSettlePrint } from "../../utils/settlePrintConfig";

/**
 * Decides whether a settlement prints, following POS config "Settle Print". When the config asks, the promise waits
 * for the cashier's Yes / No in <SettlePrintPrompt {...promptProps} />.
 */
export const useSettlePrintPrompt = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pendingAnswer = useRef<((print: boolean) => void) | null>(null);

  const answer = useCallback((print: boolean) => {
    pendingAnswer.current?.(print);
    pendingAnswer.current = null;
    setIsOpen(false);
  }, []);

  // Leaving the screen must not leave a settlement waiting forever (it holds the settle lock).
  useEffect(() => () => pendingAnswer.current?.(false), []);

  const decide = useCallback(
    () =>
      decideSettlePrint(
        () =>
          new Promise<boolean>((resolve) => {
            pendingAnswer.current = resolve;
            setIsOpen(true);
          })
      ),
    []
  );

  return { decide, promptProps: { isOpen, onAnswer: answer } };
};
