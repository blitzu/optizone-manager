
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

// Fusul orar pentru România
const ROMANIA_TIMEZONE = "Europe/Bucharest";

// Funcții pentru formatarea datelor cu fusul orar România/București
export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    
    // Formatare dată și oră cu fus orar specific (România)
    // Added seconds to the format (HH:mm:ss)
    return formatInTimeZone(
      date,
      ROMANIA_TIMEZONE,
      "dd.MM.yyyy HH:mm:ss",
      { locale: ro }
    );
  } catch (error) {
    console.error("Eroare la formatarea datei:", error);
    return dateString;
  }
};

export const formatDateForAPI = (date: Date): string => {
  // Format ISO pentru API
  return date.toISOString();
};
