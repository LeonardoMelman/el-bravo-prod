import { getSeasonLeaderboard, type SeasonLeaderboardEntry } from "@/src/lib/scoring/getSeasonLeaderboard";

export type UserSeasonStanding = {
  rank: number;
  totalPoints: number;
  totalParticipants: number;
  pointsToNextAbove: number | null;
  nextAbove: SeasonLeaderboardEntry | null;
  nextBelow: SeasonLeaderboardEntry | null;
};

export async function getUserSeasonStanding(
  seasonId: string,
  userId: string
): Promise<UserSeasonStanding | null> {
  const leaderboard = await getSeasonLeaderboard(seasonId);

  if (leaderboard.length === 0) return null;

  const index = leaderboard.findIndex((entry) => entry.userId === userId);

  if (index === -1) return null;

  const current = leaderboard[index];
  const nextAbove = index > 0 ? leaderboard[index - 1] : null;
  const nextBelow = index < leaderboard.length - 1 ? leaderboard[index + 1] : null;

  return {
    rank: current.rank,
    totalPoints: current.points,
    totalParticipants: leaderboard.length,
    pointsToNextAbove: nextAbove ? Math.max(0, nextAbove.points - current.points) : null,
    nextAbove,
    nextBelow,
  };
}