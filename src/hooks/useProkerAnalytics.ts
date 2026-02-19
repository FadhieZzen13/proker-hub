import { useState, useCallback, useEffect } from "react";

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

const STORAGE_KEY = "proker_analytics";

function loadAll(): Record<string, ProkerAnalytics> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, ProkerAnalytics>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Hook ---
export function useProkerAnalytics(prokerId?: string) {
  const [allData, setAllData] = useState<Record<string, ProkerAnalytics>>(loadAll);

  // Sync with localStorage on mount
  useEffect(() => {
    setAllData(loadAll());
  }, [prokerId]);

  const getAnalytics = useCallback(
    (id: string): ProkerAnalytics => {
      return (
        allData[id] || {
          proker_id: id,
          promotion: { ...defaultPromotion },
          engagement: { ...defaultEngagement },
          rating: { ...defaultRating },
        }
      );
    },
    [allData]
  );

  const updatePromotion = useCallback(
    (id: string, promotion: PromotionData) => {
      const current = loadAll();
      const existing = current[id] || {
        proker_id: id,
        promotion: { ...defaultPromotion },
        engagement: { ...defaultEngagement },
        rating: { ...defaultRating },
      };
      existing.promotion = promotion;
      current[id] = existing;
      saveAll(current);
      setAllData({ ...current });
    },
    []
  );

  const updateEngagement = useCallback(
    (id: string, engagement: EngagementData) => {
      const current = loadAll();
      const existing = current[id] || {
        proker_id: id,
        promotion: { ...defaultPromotion },
        engagement: { ...defaultEngagement },
        rating: { ...defaultRating },
      };
      existing.engagement = engagement;
      current[id] = existing;
      saveAll(current);
      setAllData({ ...current });
    },
    []
  );

  const updateRating = useCallback(
    (id: string, rating: RatingData) => {
      const current = loadAll();
      const existing = current[id] || {
        proker_id: id,
        promotion: { ...defaultPromotion },
        engagement: { ...defaultEngagement },
        rating: { ...defaultRating },
      };
      existing.rating = rating;
      current[id] = existing;
      saveAll(current);
      setAllData({ ...current });
    },
    []
  );

  const getAllAnalytics = useCallback((): Record<string, ProkerAnalytics> => {
    return loadAll();
  }, []);

  const analytics = prokerId ? getAnalytics(prokerId) : null;

  return {
    analytics,
    allData,
    getAnalytics,
    getAllAnalytics,
    updatePromotion,
    updateEngagement,
    updateRating,
  };
}
