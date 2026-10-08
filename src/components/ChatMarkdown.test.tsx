import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ChatMarkdown } from "./ChatMarkdown";

describe("ChatMarkdown", () => {
  it("renders the assistant's proker reply as a proper list with bold text", () => {
    const text = `Proker paling deket dari sekarang (**8 Okt 2026**) ini:

1. **Welcoming Day** — Divisi **AKSI**  
   Tanggal: **17 Oktober 2026**  
   Tipe: Internal

Disusul sama **GELORA CUP** (SEBURA).`;
    const { container } = render(<ChatMarkdown text={text} />);
    expect(container.textContent).not.toContain("**");
    const ol = container.querySelector("ol")!;
    expect(ol.querySelectorAll("li")).toHaveLength(1);
    expect(ol.textContent).toContain("Tanggal: 17 Oktober 2026");
    expect(container.querySelectorAll("strong").length).toBe(5);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("never renders HTML from the model", () => {
    const { container } = render(<ChatMarkdown text={'<img src=x onerror="alert(1)"> **hi**'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
  });

  it("handles bullets, italics, code and headings", () => {
    const { container } = render(<ChatMarkdown text={"## Judul\n- satu *miring*\n- dua `kode`"} />);
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelector("em")?.textContent).toBe("miring");
    expect(container.querySelector("code")?.textContent).toBe("kode");
    expect(container.textContent).not.toContain("#");
  });
});
