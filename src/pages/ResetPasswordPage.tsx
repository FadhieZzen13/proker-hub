import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { resetCall } from "@/lib/passwordReset";

// Opened from the one-time link an admin sends over WhatsApp. Works while logged out.
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return setState("invalid");
    resetCall<{ name: string }>({ action: "check", token })
      .then((r) => { setName(r.name); setState("ready"); })
      .catch((e) => { setError((e as Error).message); setState("invalid"); });
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 4) return setError("Password must be at least 4 characters");
    if (password !== confirm) return setError("Passwords don't match");
    setBusy(true);
    try {
      await resetCall({ action: "reset", token, password });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = "bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30";
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#1e3a5f] to-[#0a1628] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white">PPI UPM</h1>
          <p className="text-sm text-white/60 mt-1">Management Dashboard</p>
        </div>
        <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
          {state === "checking" && <CardContent className="py-10 text-center text-sm text-white/60">Checking your link…</CardContent>}

          {state === "invalid" && (
            <>
              <CardHeader>
                <CardTitle className="text-lg text-white">Link not valid</CardTitle>
                <CardDescription className="text-white/60">{error || "This reset link is missing or broken. You can request a new one from the login screen."}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold" onClick={() => window.location.assign("/")}>Go to login</Button>
              </CardContent>
            </>
          )}

          {state === "ready" && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">Set a new password</CardTitle>
                <CardDescription className="text-white/60">For {name}. This link works once.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-xs uppercase tracking-wider">New password</Label>
                    <div className="relative">
                      <Input type={show ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} className={`${field} pr-10`} autoFocus />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" onClick={() => setShow((v) => !v)}>
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-xs uppercase tracking-wider">Confirm password</Label>
                    <Input type={show ? "text" : "password"} value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} className={field} />
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold" disabled={busy || !password}>
                    Save new password <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {state === "done" && (
            <>
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2"><Check className="h-5 w-5 text-green-400" /> Password updated</CardTitle>
                <CardDescription className="text-white/60">Log in with your name and the new password.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold" onClick={() => window.location.assign("/")}>Go to login</Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
