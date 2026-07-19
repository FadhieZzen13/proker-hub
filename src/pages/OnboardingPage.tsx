import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemberStore, type Member } from "@/hooks/useMemberStore";
import { DIVISIONS } from "@/hooks/useProkers";
import { Search, UserPlus, LogIn, ArrowRight, Check, ShieldCheck, Eye, EyeOff } from "lucide-react";

const FACULTIES = [
  "Faculty of Agriculture",
  "Faculty of Forestry and Environment",
  "Faculty of Veterinary Medicine",
  "Faculty of Economics and Management",
  "Faculty of Engineering",
  "Faculty of Educational Studies",
  "Faculty of Science",
  "Faculty of Food Science and Technology",
  "Faculty of Design and Architecture",
  "Faculty of Modern Languages and Communication",
  "Faculty of Medicine and Health Sciences",
  "Faculty of Human Ecology",
  "Faculty of Biotechnology and Biomolecular Sciences",
  "Faculty of Computer Science and Information Technology",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const INTAKE_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);

type Screen = "gate" | "search" | "password" | "register" | "admin";

export default function OnboardingPage() {
  const { members, register, login, getPasswordStatus, verifyPassword, setPassword, loginAdmin } = useMemberStore();
  const [screen, setScreen] = useState<Screen>("gate");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Member password step
  const [authMode, setAuthMode] = useState<"verify" | "set">("verify");
  const [password, setPasswordVal] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // Register state
  const [form, setForm] = useState({
    name: "", faculty: "", intake: "", phone: "", division: "", birthDate: "", password: "", confirm: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  // Admin state
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, searchQuery]);

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.faculty) e.faculty = "Faculty is required";
    if (!form.intake) e.intake = "Intake year is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.division) e.division = "Division is required";
    if (form.password.length < 4) e.password = "Password must be at least 4 characters";
    if (form.confirm !== form.password) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    await register({
      name: form.name.trim(),
      faculty: form.faculty,
      intake: parseInt(form.intake),
      phone: form.phone.trim(),
      division: form.division,
      birthDate: form.birthDate || null,
    }, form.password);
  };

  // Continue from member search → decide whether they set or verify a password.
  const handleContinue = async () => {
    if (!selectedMember) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const hasPassword = await getPasswordStatus(selectedMember.id);
      setAuthMode(hasPassword ? "verify" : "set");
      setPasswordVal(""); setConfirmPassword("");
      setScreen("password");
    } catch {
      setAuthError("Something went wrong. Try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!selectedMember) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "set") {
        if (password.length < 4) { setAuthError("Password must be at least 4 characters"); return; }
        if (password !== confirmPassword) { setAuthError("Passwords don't match"); return; }
        await setPassword(selectedMember.id, password);
        login(selectedMember);
      } else {
        const ok = await verifyPassword(selectedMember.id, password);
        if (!ok) { setAuthError("Incorrect password"); setPasswordVal(""); return; }
        login(selectedMember);
      }
    } catch {
      setAuthError("Something went wrong. Try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminLogin = () => {
    const ok = loginAdmin(adminPassword);
    if (!ok) {
      setAdminError("Incorrect password");
      setAdminPassword("");
    }
  };

  const set = (field: keyof typeof form) => (val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const goBack = (to: Screen = "gate") => {
    setScreen(to);
    setSearchQuery(""); setSelectedMember(null);
    setAdminPassword(""); setAdminError("");
    setPasswordVal(""); setConfirmPassword(""); setAuthError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#1e3a5f] to-[#0a1628] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur mb-4">
            <img src="/logo.png" alt="PPI UPM" className="h-10 w-10 rounded-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">PPI UPM</h1>
          <p className="text-sm text-white/60 mt-1">Management Dashboard</p>
        </div>

        {/* Gate */}
        {screen === "gate" && (
          <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-white">Welcome!</CardTitle>
              <CardDescription className="text-white/60">Have you registered before?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold" onClick={() => setScreen("search")}>
                <LogIn className="h-4 w-4 mr-2" /> Yes, I'm already registered
              </Button>
              <Button variant="outline" className="w-full border-white/30 text-[#1e3a5f] hover:bg-white/10 hover:text-white" onClick={() => setScreen("register")}>
                <UserPlus className="h-4 w-4 mr-2" /> No, I'm new — register me
              </Button>
              <div className="pt-2 text-center">
                <button className="text-xs text-white/25 hover:text-white/50 transition-colors" onClick={() => setScreen("admin")}>
                  Admin
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search / Login */}
        {screen === "search" && (
          <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
            <CardHeader className="pb-4">
              <button className="text-xs text-white/50 hover:text-white/80 mb-2 text-left" onClick={() => goBack()}>&larr; Back</button>
              <CardTitle className="text-lg text-white">Find your name</CardTitle>
              <CardDescription className="text-white/60">Search and select your name to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Type your name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedMember(null); }}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                />
              </div>
              {searchQuery.trim() && (
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <p className="text-sm text-white/50 text-center py-4">
                      No match found.{" "}<button className="underline text-white/70" onClick={() => setScreen("register")}>Register instead?</button>
                    </p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between ${
                          selectedMember?.id === m.id ? "bg-white/20" : "hover:bg-white/10"
                        }`}
                        onClick={() => setSelectedMember(m)}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{m.name}</p>
                          <p className="text-xs text-white/50">{m.division} · {m.faculty} · {m.intake}</p>
                        </div>
                        {selectedMember?.id === m.id && <Check className="h-4 w-4 text-green-400" />}
                      </button>
                    ))
                  )}
                </div>
              )}
              <Button className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold" disabled={!selectedMember || authBusy} onClick={handleContinue}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Member password (verify or set) */}
        {screen === "password" && selectedMember && (
          <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
            <CardHeader className="pb-4">
              <button className="text-xs text-white/50 hover:text-white/80 mb-2 text-left" onClick={() => goBack("search")}>&larr; Back</button>
              <CardTitle className="text-lg text-white">{authMode === "set" ? "Create a password" : `Welcome back, ${selectedMember.name.split(" ")[0]}`}</CardTitle>
              <CardDescription className="text-white/60">
                {authMode === "set"
                  ? "First time signing in — set a password for your account."
                  : "Enter your password to continue."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder={authMode === "set" ? "Choose a password" : "Your password"}
                    value={password}
                    onChange={(e) => { setPasswordVal(e.target.value); setAuthError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && authMode === "verify" && handlePasswordSubmit()}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30 pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" onClick={() => setShowPass((v) => !v)}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {authMode === "set" && (
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs uppercase tracking-wider">Confirm Password</Label>
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setAuthError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                  />
                </div>
              )}
              {authError && <p className="text-xs text-red-400">{authError}</p>}
              <Button className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold" disabled={authBusy || !password} onClick={handlePasswordSubmit}>
                {authMode === "set" ? "Set password & enter" : "Login"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Register */}
        {screen === "register" && (
          <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
            <CardHeader className="pb-4">
              <button className="text-xs text-white/50 hover:text-white/80 mb-2 text-left" onClick={() => goBack()}>&larr; Back</button>
              <CardTitle className="text-lg text-white">Create your profile</CardTitle>
              <CardDescription className="text-white/60">Fill in your details to join the dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Full Name</Label>
                <Input placeholder="e.g. Zen Ahmad" value={form.name} onChange={(e) => set("name")(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30" />
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Faculty</Label>
                <Select value={form.faculty} onValueChange={set("faculty")}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-white/30"><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>{FACULTIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
                {errors.faculty && <p className="text-xs text-red-400">{errors.faculty}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Intake Year</Label>
                <Select value={form.intake} onValueChange={set("intake")}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-white/30"><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>{INTAKE_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
                {errors.intake && <p className="text-xs text-red-400">{errors.intake}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Phone / WhatsApp</Label>
                <Input placeholder="e.g. +62 812 3456 7890" value={form.phone} onChange={(e) => set("phone")(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30" />
                {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Division</Label>
                <div className="flex flex-wrap gap-2">
                  {DIVISIONS.map((d) => (
                    <button key={d} type="button" onClick={() => set("division")(d)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.division === d ? "bg-white text-[#1e3a5f] border-white" : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                      }`}>{d}</button>
                  ))}
                </div>
                {errors.division && <p className="text-xs text-red-400">{errors.division}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Birth Date</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => set("birthDate")(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder="Choose a password" value={form.password}
                    onChange={(e) => set("password")(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30 pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" onClick={() => setShowPass((v) => !v)}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Confirm Password</Label>
                <Input type={showPass ? "text" : "password"} placeholder="Re-enter password" value={form.confirm}
                  onChange={(e) => set("confirm")(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30" />
                {errors.confirm && <p className="text-xs text-red-400">{errors.confirm}</p>}
              </div>
              <Button className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold mt-2" onClick={handleRegister}>
                <UserPlus className="h-4 w-4 mr-2" /> Register & Enter Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Admin Login */}
        {screen === "admin" && (
          <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
            <CardHeader className="pb-4">
              <button className="text-xs text-white/50 hover:text-white/80 mb-2 text-left" onClick={() => goBack()}>&larr; Back</button>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-white/70" />
                <CardTitle className="text-lg text-white">Admin Login</CardTitle>
              </div>
              <CardDescription className="text-white/60">PPI UPM administrator access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => { setAdminPassword(e.target.value); setAdminError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30 pr-10"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" onClick={() => setShowPass((v) => !v)}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {adminError && <p className="text-xs text-red-400">{adminError}</p>}
              </div>
              <Button className="w-full bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold" onClick={handleAdminLogin}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Login as Admin
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
