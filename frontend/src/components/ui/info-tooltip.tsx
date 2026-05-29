// Іконка довідки + компоненти тултіпа
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Тип пропсів: передається рядок з поясненням
interface InfoTooltipProps {
  text: string;
}

// Компонент контекстної підказки: іконка «i» з випадаючим описом
export default function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        {/* Кнопка-тригер: не сабмітить форми, має aria-label для скрінрідерів */}
        <TooltipTrigger asChild>
          <button
                type="button"
                aria-label="Інформація"
                className="inline-flex items-center ml-1 text-muted-foreground"
                >
                <Info className="w-4 h-4" />
           </button>
        </TooltipTrigger>

        {/* Контейнер підказки: обмежує ширину, щоб текст не розтікався на всю ширину екрану */}
        <TooltipContent className="max-w-xs text-sm">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}