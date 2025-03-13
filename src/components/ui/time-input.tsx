
import * as React from "react";
import { cn } from "@/lib/utils";

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  defaultHour?: string;
  defaultMinute?: string;
}

// Componenta personalizată pentru input-uri de tip time în format 24 ore
const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, defaultHour = "00", defaultMinute = "00", value, onChange, ...props }, ref) => {
    const [timeValue, setTimeValue] = React.useState(value || `${defaultHour}:${defaultMinute}`);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Asigurăm-ne că valoarea este în format 24 ore
      const newValue = e.target.value;
      setTimeValue(newValue);
      
      if (onChange) {
        // Creăm un nou eveniment sintetic pentru a păstra interfața
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: newValue
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
    };

    React.useEffect(() => {
      if (value) {
        setTimeValue(value);
      }
    }, [value]);

    return (
      <div className="time-input-24h">
        <input
          type="time"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          value={timeValue}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
        {/* Adaugă un text pentru a indica formatul 24h */}
        <div className="text-xs text-muted-foreground text-right mt-1">
          Format 24h
        </div>
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";

export { TimeInput };
