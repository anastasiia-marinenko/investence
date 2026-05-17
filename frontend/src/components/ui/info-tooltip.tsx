import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
                type="button"
                aria-label="Інформація"
                className="inline-flex items-center ml-1 text-muted-foreground"
                >
                <Info className="w-4 h-4" />
           </button>
        </TooltipTrigger>

        <TooltipContent className="max-w-xs text-sm">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}