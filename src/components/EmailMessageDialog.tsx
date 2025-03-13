
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EmailMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  password: string | null;
  requirePasswordChange: boolean;
  role?: string;
}

const EmailMessageDialog = ({
  open,
  onOpenChange,
  username,
  password,
  requirePasswordChange,
  role = "user",
}: EmailMessageDialogProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const appUrl = window.location.origin;
  
  // Format the role for display in the email
  const formattedRole = role === "admin" ? "Administrator" : "Utilizator standard";
  
  const emailMessage = `
Bună,

Tocmai ți-am creat un cont în aplicația Optizone Log Manager.

Poți accesa aplicația la adresa: ${appUrl}

Detalii de autentificare:
Utilizator: ${username}
Parolă: ${password}
Rol în aplicație: ${formattedRole}
${requirePasswordChange ? "La prima autentificare va trebui să-ți schimbi parola." : ""}

În caz că întâmpini probleme cu autentificarea, te rog să mă contactezi.

Cu stimă,
`.trim();

  const copyToClipboard = () => {
    const textArea = document.createElement('textarea');
    textArea.value = emailMessage;
    
    // Make the textarea part of the DOM but visually hidden
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    // Select and copy
    textArea.focus();
    textArea.select();
    
    let successful = false;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(emailMessage)
          .then(() => {
            setCopied(true);
            toast({
              title: "Mesaj copiat",
              description: "Mesajul a fost copiat în clipboard",
            });
            setTimeout(() => setCopied(false), 2000);
          })
          .catch((err) => {
            console.error('Error with Clipboard API:', err);
            // If modern API fails, try execCommand as fallback
            successful = document.execCommand('copy');
            handleCopyResult(successful);
          });
      } else {
        // Use execCommand for browsers without clipboard API
        successful = document.execCommand('copy');
        handleCopyResult(successful);
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "Eroare",
        description: "Nu s-a putut copia mesajul",
        variant: "destructive",
      });
    }
    
    // Clean up
    document.body.removeChild(textArea);
  };
  
  const handleCopyResult = (successful: boolean) => {
    if (successful) {
      setCopied(true);
      toast({
        title: "Mesaj copiat",
        description: "Mesajul a fost copiat în clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: "Eroare",
        description: "Nu s-a putut copia mesajul",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mesaj pentru utilizatorul nou</DialogTitle>
          <DialogDescription>
            Copiază acest mesaj și trimite-l utilizatorului nou prin email
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-message">Mesaj email</Label>
            <Textarea
              id="email-message"
              className="h-[200px] font-mono text-sm"
              value={emailMessage}
              readOnly
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Închide
          </Button>
          <Button type="button" onClick={copyToClipboard}>
            {copied ? (
              <>
                <ClipboardCheck className="h-4 w-4 mr-2 text-green-500" />
                Copiat
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4 mr-2" />
                Copiază mesajul
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailMessageDialog;
