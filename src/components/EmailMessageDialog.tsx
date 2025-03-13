
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
import { Copy, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EmailMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  password: string | null;
  requirePasswordChange: boolean;
}

const EmailMessageDialog = ({
  open,
  onOpenChange,
  username,
  password,
  requirePasswordChange,
}: EmailMessageDialogProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const appUrl = window.location.origin;
  
  const emailMessage = `
Bună,

Tocmai ți-am creat un cont în aplicația Optizone Log Manager.

Poți accesa aplicația la adresa: ${appUrl}

Detalii de autentificare:
Utilizator: ${username}
Parolă: ${password}
${requirePasswordChange ? "La prima autentificare va trebui să-ți schimbi parola." : ""}

În caz că întâmpini probleme cu autentificarea, te rog să mă contactezi.

Cu stimă,
`.trim();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(emailMessage);
      setCopied(true);
      toast({
        title: "Mesaj copiat",
        description: "Mesajul a fost copiat în clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
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
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Copiat
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
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
