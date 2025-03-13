
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
    // Create a textarea element to hold our text
    const textArea = document.createElement('textarea');
    textArea.value = emailMessage;
    
    // Append the textarea to the document
    document.body.appendChild(textArea);
    
    // Select the text
    textArea.select();
    
    try {
      // Execute the copy command
      const successful = document.execCommand('copy');
      
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
    } catch (err) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut copia mesajul",
        variant: "destructive",
      });
    }
    
    // Remove the textarea
    document.body.removeChild(textArea);
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
