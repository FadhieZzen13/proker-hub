import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ImageUpload } from "./ImageUpload";

const upload = vi.fn();
vi.mock("@/lib/siteImageUpload", () => ({ uploadSiteImage: (...a: unknown[]) => upload(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("ImageUpload", () => {
  beforeEach(() => {
    upload.mockReset();
  });

  it("uploads the picked file to the right folder with the admin password, then reports the URL", async () => {
    upload.mockResolvedValue("https://x.supabase.co/storage/v1/object/public/site-images/divisions/1.jpg");
    const onChange = vi.fn();
    const { container } = render(<ImageUpload folder="divisions" adminSecret="pw" onChange={onChange} emptyHint="Pakai foto bawaan" />);
    expect(screen.getByText("Pakai foto bawaan")).toBeInTheDocument();
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://x.supabase.co/storage/v1/object/public/site-images/divisions/1.jpg"));
    expect(upload).toHaveBeenCalledWith(file, "divisions", "pw");
  });

  it("shows the current image and lets you remove it", () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUpload folder="members" adminSecret="pw" value="https://img/a.jpg" onChange={onChange} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img/a.jpg");
    expect(screen.getByRole("button", { name: /Ganti/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Hapus gambar"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("keeps the old image when an upload fails", async () => {
    upload.mockImplementation(async () => {
      throw new Error("Password admin salah.");
    });
    const onChange = vi.fn();
    const { container } = render(<ImageUpload folder="kabinet" adminSecret="bad" value="https://img/old.png" onChange={onChange} />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["x"], "k.png", { type: "image/png" })] } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Password admin salah."));
    expect(onChange).not.toHaveBeenCalled();
  });
});
