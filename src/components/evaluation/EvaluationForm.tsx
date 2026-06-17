import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ScoreInput } from "./ScoreInput";
import { isLeader } from "@/lib/roles";
import type { Member } from "@/hooks/useMemberStore";
import {
  useAddEvaluation, useEvaluations, useDeleteEvaluation,
  type EvaluationType,
} from "@/hooks/useEvaluations";

export function EvaluationForm({
  type, period, members, currentMember, isAdmin,
}: {
  type: EvaluationType;
  period: string;
  members: Member[];
  currentMember: Member | null;
  isAdmin: boolean;
}) {
  const add = useAddEvaluation();
  const del = useDeleteEvaluation();
  const { data: existing = [] } = useEvaluations(type, period);

  // Eligible raters
  const eligibleRaters = useMemo(
    () => (type === "best_member" ? members.filter((m) => isLeader(m)) : members.filter((m) => m.division === "BPH")),
    [members, type]
  );

  // Rater: locked to current member when they're eligible & not admin; otherwise pick.
  const selfEligible = currentMember && eligibleRaters.some((m) => m.id === currentMember.id);
  const [raterId, setRaterId] = useState<string>(selfEligible ? currentMember!.id : "");
  const effectiveRaterId = (!isAdmin && selfEligible) ? currentMember!.id : raterId;
  const rater = members.find((m) => m.id === effectiveRaterId) ?? null;

  const [email, setEmail] = useState("");
  const [targetId, setTargetId] = useState<string>("");
  const [scores, setScores] = useState({ d: 0, c: 0, r: 0 });
  const [reason, setReason] = useState("");
  const [future, setFuture] = useState("");

  // Target options
  const targets = useMemo(() => {
    if (type === "best_member") {
      const div = rater?.division;
      return members.filter((m) => m.division === div && m.position === "Staff");
    }
    if (type === "best_kadep") return members.filter((m) => m.position === "Kadep");
    if (type === "best_wakadep") return members.filter((m) => m.position === "Wakadep");
    return members.filter((m) => isLeader(m)); // legacy 'best_leader'
  }, [members, type, rater]);

  // Noun for the person being scored, used in labels/placeholders.
  const targetNoun = type === "best_kadep" ? "Kadep" : type === "best_wakadep" ? "Wakadep" : "Kadep/Wakadep";

  const target = members.find((m) => m.id === targetId) ?? null;

  // Already-submitted (best_member: one per rater/period)
  const mySubmissions = existing.filter((e) => e.rater_member_id && e.rater_member_id === effectiveRaterId);
  const alreadyForMember = type === "best_member" && mySubmissions.length > 0 ? mySubmissions[0] : null;

  const reset = () => { setTargetId(""); setScores({ d: 0, c: 0, r: 0 }); setReason(""); setFuture(""); };

  const submit = () => {
    if (!rater) return toast.error("Pilih penilai (rater) dulu.");
    if (!target) return toast.error("Pilih nama yang dinilai.");
    if (!scores.d || !scores.c || !scores.r) return toast.error("Beri skor 1–5 untuk ketiga kriteria.");
    if (!reason.trim()) return toast.error("Alasan/justifikasi wajib diisi.");

    add.mutate(
      {
        type, period,
        rater_member_id: rater.id,
        rater_name: rater.name,
        rater_email: email.trim(),
        rater_division: rater.division,
        target_member_id: target.id,
        target_name: target.name,
        target_division: target.division,
        score_discipline: scores.d,
        score_contribution: scores.c,
        score_responsibility: scores.r,
        reason: reason.trim(),
        future_eval: future.trim(),
      },
      {
        onSuccess: () => { toast.success("Penilaian terkirim. Terima kasih!"); reset(); },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? "";
          if (/duplicate|unique/i.test(msg)) toast.error("Anda sudah submit untuk bulan ini.");
          else toast.error("Gagal menyimpan: " + msg);
        },
      }
    );
  };

  if (eligibleRaters.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">
      Belum ada {type === "best_member" ? "Kadep/Wakadep" : "anggota BPH"} terdaftar. Assign posisi di halaman Members dulu.
    </p>;
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Rater */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {type === "best_member" ? "Kepala/Wakil Kepala Departemen (penilai)" : "Badan Pengurus Harian (penilai)"}
        </label>
        {(!isAdmin && selfEligible) ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground font-medium">{currentMember!.name}</span>
            <Badge variant="outline" className="text-xs">{currentMember!.division}</Badge>
            <Badge className="text-[10px] bg-primary/15 text-primary border-0">{currentMember!.position}</Badge>
          </div>
        ) : (
          <Select value={effectiveRaterId} onValueChange={(v) => { setRaterId(v); setTargetId(""); }}>
            <SelectTrigger><SelectValue placeholder="Pilih penilai" /></SelectTrigger>
            <SelectContent>
              {eligibleRaters.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name} · {m.division}{m.position !== "Staff" ? ` · ${m.position}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email <span className="text-muted-foreground font-normal">(opsional)</span></label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@…" />
      </div>

      {alreadyForMember ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
          <p className="text-sm text-foreground">
            Anda sudah menominasikan <strong>{alreadyForMember.target_name}</strong> sebagai best member bulan ini.
          </p>
          <p className="text-xs text-muted-foreground">Hapus dulu jika ingin mengganti nominasi.</p>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
            onClick={() => del.mutate({ id: alreadyForMember.id, type, period })}>Hapus nominasi</Button>
        </div>
      ) : (
        <>
          {/* Target */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {type === "best_member" ? "Nama Anggota (staf yang dinilai)" : `Nama ${targetNoun} yang dinilai`}
            </label>
            <Select value={targetId} onValueChange={setTargetId} disabled={!rater}>
              <SelectTrigger><SelectValue placeholder={rater ? "Pilih nama" : "Pilih penilai dulu"} /></SelectTrigger>
              <SelectContent>
                {targets.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    {type === "best_member" ? "Tidak ada staf di departemen ini." : `Belum ada ${targetNoun} terdaftar.`}
                  </div>
                ) : type === "best_member" ? (
                  targets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)
                ) : (
                  <GroupedLeaders members={targets} />
                )}
              </SelectContent>
            </Select>
          </div>

          <ScoreInput label="Kedisiplinan" value={scores.d} onChange={(d) => setScores((s) => ({ ...s, d }))} />
          <ScoreInput label="Kontribusi pada Program Kerja" value={scores.c} onChange={(c) => setScores((s) => ({ ...s, c }))} />
          <ScoreInput label="Tanggung Jawab & Komitmen" value={scores.r} onChange={(r) => setScores((s) => ({ ...s, r }))} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Alasan / justifikasi <span className="text-destructive">*</span></label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[100px]"
              placeholder="Deskripsikan secara detail sesuai kriteria…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Evaluasi untuk kedepannya <span className="text-muted-foreground font-normal">(opsional)</span></label>
            <Textarea value={future} onChange={(e) => setFuture(e.target.value)} className="min-h-[70px]" />
          </div>

          <Button onClick={submit} disabled={add.isPending}>{add.isPending ? "Mengirim…" : "Kirim penilaian"}</Button>
        </>
      )}
    </div>
  );
}

function GroupedLeaders({ members }: { members: Member[] }) {
  const byDiv = new Map<string, Member[]>();
  for (const m of members) {
    if (!byDiv.has(m.division)) byDiv.set(m.division, []);
    byDiv.get(m.division)!.push(m);
  }
  return (
    <>
      {[...byDiv.entries()].map(([div, list]) => (
        <SelectGroup key={div}>
          <SelectLabel>{div}</SelectLabel>
          {list.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.position}</SelectItem>)}
        </SelectGroup>
      ))}
    </>
  );
}
