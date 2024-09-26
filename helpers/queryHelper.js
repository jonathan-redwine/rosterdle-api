export default class QueryHelper {
  constructor() {}

  getUserQuery() {
    return `SELECT
                  id
                , g_id
                , given_name
                , family_name
                , name
                , email
                , date_joined
                , last_activity
                , pref_adjective
                , pref_noun
            FROM
                [user]
            WHERE
                g_id = @gId`;
  }

  insertUserQuery() {
    return `INSERT INTO [user]
            (
                  g_id
                , given_name
                , family_name
                , name
                , email
                , date_joined
                , last_activity
            )
            VALUES
            (
                  @gId
                , @givenName
                , @familyName
                , @name
                , @email
                , @dateJoined
                , @lastActivity
            )`;
  }

  updateUserPreferencesQuery() {
    return `UPDATE 
              [user]
            SET
                pref_adjective = @prefAdjective
              , pref_noun = @prefNoun
            WHERE
              id = @userId`;
  }

  getDailyGameTargetsQuery() {
    return `SELECT
                id
              , date
              , name
              , teammates
            FROM
              [daily_game_target]`;
  }

  getUserDailyGameQuery() {
    return `SELECT
                  id
                , user_id
                , target_player_id
                , game_date
                , date_started
                , guesses
                , game_complete
                , game_won
            FROM
                [daily_game]
            WHERE
                user_id = @userId
            AND
                game_date = @gameDate`;
  }

  getUserDailyGamesQuery() {
    return `SELECT
                  id
                , user_id
                , target_player_id
                , game_date
                , date_started
                , guesses
                , game_complete
                , game_won
            FROM
                [daily_game]
            WHERE
                user_id = @userId`;
  }

  updateExistingUserDailyGameQuery() {
    return `UPDATE 
                [daily_game]
            SET
                guesses = @guesses
            WHERE
                id = @id`;
  }

  insertNewUserDailyGameQuery() {
    return `INSERT INTO [daily_game]
            (
                  user_id
                , target_player_id
                , game_date
                , date_started
                , guesses
            )
            VALUES
            (
                  @userId
                , @targetPlayerId
                , @gameDate
                , @dateStarted
                , @guesses
            )`;
  }

  getDailyGameOverQuery() {
    return `UPDATE
              [daily_game]
            SET
                game_complete = 1
              , game_won = @gameWon
            WHERE
              user_id = @userId
            AND
              game_date = @gameDate`;
  }
}
