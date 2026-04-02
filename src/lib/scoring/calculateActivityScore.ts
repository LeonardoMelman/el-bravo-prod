type ActivityType = "gym" | "run" | "sport" | "mobility" | "other";

type ActivityScoreActivityInput = {
  id: string;
  type: ActivityType;
  startedAt: Date;
  endedAt: Date;
  durationMinutes?: number | null;
};

type ActivityScoreSeasonInput = {
  id: string;
  weeklyGoal: number;
  basePointsPerActivity: number;
  allowedActivityTypes?: unknown;
  maxScoreableMinutesPerActivity?: number | null;
};

type CalculateActivityScoreInput = {
  activity: ActivityScoreActivityInput;
  season: ActivityScoreSeasonInput;
  currentActiveWeekStreak: number;
  currentPerfectWeekStreak: number;
  daysSincePreviousActivity: number | null;
};

export type CalculateActivityScoreResult = {
  eligible: boolean;
  totalPoints: number;
  basePoints: number;
  durationMinutesUsed: number;
  durationMultiplier: number;
  consistencyMultiplier: number;
  comebackBonus: number;
  reason: string | null;
  metadata: {
    activityType: ActivityType;
    rawDurationMinutes: number;
    durationMinutesUsed: number;
    weeklyGoal: number;
    basePointsPerActivity: number;
    durationMultiplier: number;
    consistencyMultiplier: number;
    currentActiveWeekStreak: number;
    currentPerfectWeekStreak: number;
    daysSincePreviousActivity: number | null;
    comebackBonus: number;
    allowedActivityTypes: ActivityType[] | null;
  };
};

function normalizeAllowedActivityTypes(value: unknown): ActivityType[] | null {
  if (!Array.isArray(value)) return null;

  const valid: ActivityType[] = [];

  for (const item of value) {
    if (
      item === "gym" ||
      item === "run" ||
      item === "sport" ||
      item === "mobility" ||
      item === "other"
    ) {
      valid.push(item);
    }
  }

  return valid.length > 0 ? valid : null;
}

function getDurationMinutes(activity: ActivityScoreActivityInput) {
  if (
    typeof activity.durationMinutes === "number" &&
    Number.isFinite(activity.durationMinutes) &&
    activity.durationMinutes > 0
  ) {
    return Math.round(activity.durationMinutes);
  }

  const diff = activity.endedAt.getTime() - activity.startedAt.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;

  return Math.max(0, Math.round(diff / (1000 * 60)));
}

function applyActivityDurationCap(
  rawDurationMinutes: number,
  maxScoreableMinutesPerActivity?: number | null
) {
  if (
    typeof maxScoreableMinutesPerActivity === "number" &&
    Number.isFinite(maxScoreableMinutesPerActivity) &&
    maxScoreableMinutesPerActivity > 0
  ) {
    return Math.min(rawDurationMinutes, Math.round(maxScoreableMinutesPerActivity));
  }

  return rawDurationMinutes;
}

function getDurationMultiplier(durationMinutes: number) {
  if (durationMinutes <= 0) return 0;
  if (durationMinutes < 30) return 0.4;
  if (durationMinutes < 45) return 0.7;
  if (durationMinutes < 75) return 1.0;
  if (durationMinutes < 120) return 1.2;
  if (durationMinutes < 150) return 1.3;
  return 1.35;
}

function getConsistencyMultiplier(
  currentActiveWeekStreak: number,
  currentPerfectWeekStreak: number
) {
  let multiplier = 1.0;

  if (currentActiveWeekStreak >= 5) {
    multiplier += 0.2;
  } else if (currentActiveWeekStreak >= 3) {
    multiplier += 0.1;
  }

  if (currentPerfectWeekStreak >= 3) {
    multiplier += 0.2;
  } else if (currentPerfectWeekStreak >= 1) {
    multiplier += 0.1;
  }

  return Number(multiplier.toFixed(2));
}

function getComebackBonus(daysSincePreviousActivity: number | null) {
  if (daysSincePreviousActivity === null) return 0;
  if (daysSincePreviousActivity >= 56) return 15;
  if (daysSincePreviousActivity >= 28) return 10;
  return 0;
}

function roundScore(value: number) {
  return Math.max(0, Math.round(value));
}

export function calculateActivityScore(
  input: CalculateActivityScoreInput
): CalculateActivityScoreResult {
  const { activity, season, currentActiveWeekStreak, currentPerfectWeekStreak, daysSincePreviousActivity } =
    input;

  const allowedActivityTypes = normalizeAllowedActivityTypes(
    season.allowedActivityTypes
  );

  if (allowedActivityTypes && !allowedActivityTypes.includes(activity.type)) {
    return {
      eligible: false,
      totalPoints: 0,
      basePoints: season.basePointsPerActivity,
      durationMinutesUsed: 0,
      durationMultiplier: 0,
      consistencyMultiplier: 1,
      comebackBonus: 0,
      reason: "activity_type_not_allowed",
      metadata: {
        activityType: activity.type,
        rawDurationMinutes: 0,
        durationMinutesUsed: 0,
        weeklyGoal: season.weeklyGoal,
        basePointsPerActivity: season.basePointsPerActivity,
        durationMultiplier: 0,
        consistencyMultiplier: 1,
        currentActiveWeekStreak,
        currentPerfectWeekStreak,
        daysSincePreviousActivity,
        comebackBonus: 0,
        allowedActivityTypes,
      },
    };
  }

  const rawDurationMinutes = getDurationMinutes(activity);
  const durationMinutesUsed = applyActivityDurationCap(
    rawDurationMinutes,
    season.maxScoreableMinutesPerActivity
  );

  if (durationMinutesUsed <= 0) {
    return {
      eligible: false,
      totalPoints: 0,
      basePoints: season.basePointsPerActivity,
      durationMinutesUsed: 0,
      durationMultiplier: 0,
      consistencyMultiplier: 1,
      comebackBonus: 0,
      reason: "invalid_duration",
      metadata: {
        activityType: activity.type,
        rawDurationMinutes,
        durationMinutesUsed: 0,
        weeklyGoal: season.weeklyGoal,
        basePointsPerActivity: season.basePointsPerActivity,
        durationMultiplier: 0,
        consistencyMultiplier: 1,
        currentActiveWeekStreak,
        currentPerfectWeekStreak,
        daysSincePreviousActivity,
        comebackBonus: 0,
        allowedActivityTypes,
      },
    };
  }

  const durationMultiplier = getDurationMultiplier(durationMinutesUsed);
  const consistencyMultiplier = getConsistencyMultiplier(
    currentActiveWeekStreak,
    currentPerfectWeekStreak
  );
  const comebackBonus = getComebackBonus(daysSincePreviousActivity);

  const basePoints = season.basePointsPerActivity;
  const variablePoints = basePoints * durationMultiplier * consistencyMultiplier;
  const totalPoints = roundScore(variablePoints + comebackBonus);

  return {
    eligible: true,
    totalPoints,
    basePoints,
    durationMinutesUsed,
    durationMultiplier,
    consistencyMultiplier,
    comebackBonus,
    reason: null,
    metadata: {
      activityType: activity.type,
      rawDurationMinutes,
      durationMinutesUsed,
      weeklyGoal: season.weeklyGoal,
      basePointsPerActivity: season.basePointsPerActivity,
      durationMultiplier,
      consistencyMultiplier,
      currentActiveWeekStreak,
      currentPerfectWeekStreak,
      daysSincePreviousActivity,
      comebackBonus,
      allowedActivityTypes,
    },
  };
}