
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [internalIp, setInternalIp] = useState("necunoscut (client)");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Obținem IP-ul intern la încărcarea componentei
  useEffect(() => {
    const detectInternalIp = async () => {
      try {
        // Metodă mai robustă pentru detectarea IP-urilor în LAN
        const interfaces = await getNetworkInterfaces();
        if (interfaces && interfaces.length > 0) {
          console.log("Network interfaces detected:", interfaces);
          // Folosim primul IP intern valid detectat
          setInternalIp(interfaces[0]);
        } else {
          console.log("Nu s-a putut detecta niciun IP intern");
          setInternalIp("necunoscut (client)");
        }
      } catch (error) {
        console.error("Eroare la detectarea IP-ului intern:", error);
        setInternalIp("necunoscut (eroare)");
      }
    };

    detectInternalIp();
  }, []);

  // Funcție pentru a obține toate interfețele de rețea
  const getNetworkInterfaces = () => {
    return new Promise<string[]>((resolve) => {
      const ips: string[] = [];

      // Folosim WebRTC pentru a descoperi toate IP-urile
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // Timeout pentru a ne asigura că nu așteptăm la infinit
        const timeoutId = setTimeout(() => {
          pc.close();
          console.log("Timeout la detectarea IP-urilor, returnăm ce am găsit:", ips);
          resolve(ips.length > 0 ? ips : []);
        }, 2000);

        pc.createDataChannel("");
        
        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          
          // Regex optimizat pentru adrese IP private (LAN)
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const ipMatch = ipRegex.exec(event.candidate.candidate);
          
          if (ipMatch && ipMatch[1]) {
            const ip = ipMatch[1];
            
            // Verificăm dacă este un IP intern/privat
            if (
              ip.startsWith('10.') || 
              ip.startsWith('192.168.') || 
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
              ip.startsWith('169.254.') // Link-local addresses
            ) {
              if (!ips.includes(ip)) {
                console.log("IP intern detectat:", ip);
                ips.push(ip);
              }
            }
          }
        };

        // După ce am colectat toate candidații ICE, returnăm IP-urile
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeoutId);
            pc.close();
            console.log("Colectare IP-uri completă:", ips);
            resolve(ips);
          }
        };
        
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
      } catch (error) {
        console.error("Eroare la obținerea interfețelor de rețea:", error);
        resolve([]);
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username || !password) {
      toast({
        title: "Eroare",
        description: "Vă rugăm să completați ambele câmpuri",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login for user:", username);
      console.log("Using internal IP:", internalIp);
      
      const result = await login(username, password, internalIp);
      
      console.log("Login result:", result);
      console.log("User data with lastLogin info:", result.user);
      
      if (result.success) {
        toast({
          title: "Autentificare reușită",
          description: `Bine ai venit, ${result.user?.username || username}!`
        });
        
        // Show lastLogin info in toast if available
        if (result.user?.lastLogin) {
          console.log("LastLogin data:", result.user.lastLogin);
          const lastLoginDate = new Date(result.user.lastLogin.date).toLocaleString('ro-RO');
          toast({
            title: "Informații de autentificare",
            description: `Ultima autentificare: ${lastLoginDate}`,
          });
        } else {
          console.log("No lastLogin data available in user object");
          
          // Pentru prima autentificare sau când nu există date de autentificare anterioare
          toast({
            title: "Informații de autentificare",
            description: "Aceasta este prima dvs. autentificare sau nu există informații anterioare."
          });
        }
        
        // Immediately navigate to home
        navigate("/");
      } else {
        // Error message is shown by the login function via toast
        console.error(result.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la autentificare",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold">
            Autentificare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nume utilizator</Label>
              <Input
                id="username"
                placeholder="Nume utilizator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                placeholder="Parolă"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-button"
            >
              {loading ? "Se procesează..." : "Autentificare"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
