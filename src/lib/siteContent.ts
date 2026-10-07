// Shape of public.site_settings.content — what the public website (ppi-upm-site) renders.
// Keep in sync with ppi-upm-site/src/content.ts (SiteContent).
export interface SiteContent {
  term?: string;
  email?: string;
  dashboardUrl?: string;
  heroImage?: string;
  home?: { eyebrow?: string; headline?: string; lead?: string };
  about?: string;
  vision?: string;
  missions?: string[];
  stats?: { label: string; value: string }[];
  divisions?: Record<string, { name?: string; description?: string }>;
  socials?: { instagram?: string; youtube?: string; linkedin?: string; tiktok?: string };
  latest?: { id: string; title: string; kind: string; url: string; image: string }[];
  sections?: { latest?: boolean; pengurus?: boolean };
}
