import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Proker } from "@/hooks/useProkers";

// --- Types ---
export interface PromotionData {
  views: number;
  groups_shared: string[];
  platforms: string[];
}

export interface EngagementData {
  attendance_rate: number; // 0-100
  feedback_score: number; // 0-5
  social_media_reach: number;
  other_notes: string;
}

export interface RatingData {
  planning: number; // 1-5
  execution: number; // 1-5
  impact: number; // 1-5
  creativity: number; // 1-5
  teamwork: number; // 1-5
}

export interface ProkerAnalytics {
  proker_id: string;
  promotion: PromotionData;
  engagement: EngagementData;
  rating: RatingData;
}

// --- Defaults ---
export const defaultPromotion: PromotionData = {
  views: 0,
  groups_shared: [],
  platforms: [],
};

export const defaultEngagement: EngagementData = {
  attendance_rate: 0,
  feedback_score: 0,
  social_media_reach: 0,
  other_notes: "",
};

export const defaultRating: RatingData = {
  planning: 0,
  execution: 0,
  impact: 0,
  creativity: 0,
  teamwork: 0,
};

export function computeOverallRating(r: RatingData): number {
  const scores = [r.planning, r.execution, r.impact, r.creativity, r.teamwork];
  const nonZero = scores.filter((s) => s > 0);
  if (nonZero.length === 0) return 0;
  return parseFloat((nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(1));
}

function analyticsFromProker(proker: Proker): ProkerAnalytics {
  // Deep-merge with defaults so partial JSONB rows never produce undefined fields
  return {
    proker_id: proker.id,
    promotion: { ...defaultPromotion, ...(proker.promotion_data ?? {}) },
    engagement: { ...defaultEngagement, ...(proker.engagement_data ?? {}) },
    rating: { ...defaultRating, ...(proker.rating_data ?? {}) },
  };
}

/** Hook for reading and writing analytics for a single proker.
 *  Analytics are stored in the prokers table (promotion_data, engagement_data, rating_data).
 *  Pass the proker object so the hook can derive current values from it.
 */
export function useProkerAnalytics(proker?: Proker | null) {
  const qc = useQueryClient();

  const analytics: ProkerAnalytics | undefined = proker ? analyticsFromProker(proker) : undefined;

  const updatePromotion = useCallback(
    async (id: string, promotion: PromotionData) => {
      const { error } = await supabase
        .from("prokers")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ promotion_data: promotion as any })
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
    [qc]
  );

  const updateEngagement = useCallback(
    async (id: string, engagement: EngagementData) => {
      const { error } = await supabase
        .from("prokers")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ engagement_data: engagement as any })
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
    [qc]
  );

  const updateRating = useCallback(
    async (id: string, rating: RatingData) => {
      const { error } = await supabase
        .from("prokers")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ rating_data: rating as any })
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
    [qc]
  );

  const updateAllAnalytics = useCallback(
    async (id: string, promotion: PromotionData, engagement: EngagementData, rating: RatingData) => {
      const { error } = await supabase
        .from("prokers")
        .update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          promotion_data: promotion as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          engagement_data: engagement as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rating_data: rating as any,
        })
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
    [qc]
  );

  return { analytics, updatePromotion, updateEngagement, updateRating, updateAllAnalytics };
}

/** Derive allData (ProkerAnalytics map by proker id) from an array of prokers.
 *  Used by ProkerAnalyticsDashboard which already has all prokers from useProkers().
 */
export function deriveAllAnalytics(prokers: Proker[]): Record<string, ProkerAnalytics> {
  const result: Record<string, ProkerAnalytics> = {};
  for (const p of prokers) {
    result[p.id] = analyticsFromProker(p);
  }
  return result;
}
