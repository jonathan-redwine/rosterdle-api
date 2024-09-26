export default class DataProcessingHelper {
  constructor() {}

  processUser = user => {
    return {
      id: user.id,
      gId: user.g_id,
      givenName: user.given_name,
      familyName: user.family_name,
      name: user.name,
      email: user.email,
      dateJoined: user.date_joined,
      lastActivity: user.last_activity,
      prefAdjective: user.pref_adjective,
      prefNoun: user.pref_noun,
    };
  };

  processUserDailyGames = dailyGames => {
    return dailyGames.map(dailyGame => ({
      id: dailyGame.id,
      targetPlayerId: dailyGame.target_player_id,
      gameDate: dailyGame.game_date,
      dateStarted: dailyGame.date_started,
      guesses: dailyGame.guesses,
      gameComplete: dailyGame.game_complete,
      gameWon: dailyGame.game_won,
    }));
  };

  processDailyGameTargets = targets => {
    return targets.map(target => ({
      id: target.id,
      date: target.date,
      name: target.name,
      teammates: target.teammates,
    }));
  };
}
