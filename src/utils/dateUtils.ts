
import { format, formatISO, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

// Funcții pentru formatarea datelor cu fusul orar România/București
export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    
    // România este UTC+2 (iarna) și UTC+3 (vara)
    // Vom folosi o abordare simplificată pentru demo
    return format(date, "dd.MM.yyyy HH:mm:ss", {
      locale: ro,
    });
  } catch (error) {
    console.error("Eroare la formatarea datei:", error);
    return dateString;
  }
};

export const combineDateTime = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const formatDateForAPI = (date: Date): string => {
  return formatISO(date);
};
