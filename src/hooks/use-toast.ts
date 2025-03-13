
// This file re-exports the toast functionality from @radix-ui/react-toast
import { useToast as useRadixToast } from "@radix-ui/react-toast";
import { toast as toastFunction } from "@/components/ui/toast";

export const useToast = useRadixToast;
export const toast = toastFunction;
