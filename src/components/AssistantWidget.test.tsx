import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssistantWidget } from "./AssistantWidget";

const member = { id: "m-1", name: "Haryo Pratama", division: "AKSI", position: "Kadep", faculty: "", intake: 2023, phone: "", registeredAt: "" };
vi.mock("@/hooks/useMemberStore", () => ({ useMemberStore: () => ({ currentMember: member }) }));

function renderWidget() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <AssistantWidget />
    </QueryClientProvider>
  );
  return { spy };
}

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("AssistantWidget", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("asks for the password, then chats and refreshes prokers after a change", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      if (body.action === "login") return body.password === "rahasia" ? reply(200, { token: "tok" }) : reply(401, { error: "Password salah." });
      return reply(200, {
        reply: "Proker dibuat sebagai draft.",
        changed: ["prokers"],
        actions: [{ tool: "create_proker", outcome: "done", label: 'Proker "Futsal Cup" dibuat (draft, AKSI, 2026-12-01).' }],
      });
    });
    const { spy } = renderWidget();

    fireEvent.click(screen.getByLabelText("Buka Asisten PPI"));
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "salah" } });
    fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
    expect(await screen.findByText("Password salah.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "rahasia" } });
    fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
    const input = await screen.findByPlaceholderText("Tulis pesan...");

    fireEvent.change(input, { target: { value: "buat proker futsal" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("Proker dibuat sebagai draft.")).toBeInTheDocument();
    expect(screen.getByTestId("receipt")).toHaveTextContent('Proker "Futsal Cup" dibuat');

    const chatCall = fetchMock.mock.calls.find(([, init]) => JSON.parse(String((init as RequestInit).body)).action === "chat")!;
    const sent = JSON.parse(String((chatCall[1] as RequestInit).body));
    expect(sent.token).toBe("tok");
    expect(sent.messages).toEqual([{ role: "user", content: "buat proker futsal" }]);
    expect(spy).toHaveBeenCalledWith({ queryKey: ["prokers"] });
  });

  it("shows blocked replies and does not send blocked turns back as context", async () => {
    sessionStorage.setItem("ppi_assistant_token_m-1", JSON.stringify("tok"));
    const bodies: { messages: unknown[] }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      bodies.push(body);
      return bodies.length === 1 ? reply(200, { reply: "Maaf, aku cuma bisa bantu hal-hal soal PPI UPM.", blocked: true }) : reply(200, { reply: "Ada 3 proker." });
    });
    renderWidget();
    fireEvent.click(screen.getByLabelText("Buka Asisten PPI"));
    const input = screen.getByPlaceholderText("Tulis pesan...");

    fireEvent.change(input, { target: { value: "cuaca besok?" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText(/cuma bisa bantu/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "proker AKSI?" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("Ada 3 proker.");
    expect(bodies[1].messages).toEqual([{ role: "user", content: "proker AKSI?" }]);
  });

  it("goes back to the password step when the session expires", async () => {
    sessionStorage.setItem("ppi_assistant_token_m-1", JSON.stringify("old"));
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(401, { error: "Sesi berakhir. Masukkan password lagi." }));
    renderWidget();
    fireEvent.click(screen.getByLabelText("Buka Asisten PPI"));
    const input = screen.getByPlaceholderText("Tulis pesan...");
    fireEvent.change(input, { target: { value: "halo" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByPlaceholderText("Password")).toBeInTheDocument());
    expect(sessionStorage.getItem("ppi_assistant_token_m-1")).toBeNull();
  });
});
