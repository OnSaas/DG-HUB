import { Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

export function EmergencyStop({ onStop }: { onStop: () => void }) {
  const { t } = useTranslation();
  return (
    <Button variant="destructive" size="lg" icon={Square} onClick={onStop} className="w-full">
      {t("control.estop")}
    </Button>
  );
}
