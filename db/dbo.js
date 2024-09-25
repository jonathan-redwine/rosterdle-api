const sql = require('mssql');
const configDotenv = require('dotenv');
const QueryHelper = require('../helpers/queryHelper.js');

class Dbo {
  static instance_;

  constructor() {
    if (this.instance_) return this.instance_; // return instance if already declared
    configDotenv.configDotenv();
    this.instance_ = this;
    this.config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      server: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
    };
    this.queryHelper = new QueryHelper();
  }

  getUser(userInfo) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.getUserQuery();
      sql.connect(this.config, err => {
        if (err) reject(new Error(`Something went wrong connecting to db when attempting to get user: ${err}`));
        var request = new sql.Request();
        request.input('gId', sql.VarChar, userInfo.id);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when getting user from db: ${err}`));
          if (!(recordset.recordset || []).length) {
            this.insertUser(userInfo).then(() => {
              this.getUser(userInfo).then(userInfo => {
                resolve(userInfo);
              });
            });
          } else {
            resolve(recordset.recordset[0]);
          }
        });
      });
    });
  }

  insertUser(userInfo) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.insertUserQuery();
      sql.connect(this.config, err => {
        if (err) reject(new Error(`Something went wront connecting to db when attempting to insert user: ${err}`));
        var request = new sql.Request();
        const now = new Date();
        request.input('gId', sql.VarChar, userInfo.id);
        request.input('givenName', sql.VarChar, userInfo.given_name);
        request.input('familyName', sql.VarChar, userInfo.family_name);
        request.input('name', sql.VarChar, userInfo.name);
        request.input('email', sql.VarChar, userInfo.email);
        request.input('dateJoined', sql.DateTime, now);
        request.input('lastActivity', sql.DateTime, now);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when inserting new user: ${err}`));
          resolve(recordset);
        });
      });
    });
  }

  setUserPreferences(userPreferences) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.updateUserPreferencesQuery();
      sql.connect(this.config, err => {
        if (err)
          reject(new Error(`Something went wrong connecting to db when attempting to update user preferences: ${err}`));
        var request = new sql.Request();
        request.input('userId', sql.Int, userPreferences.userId);
        request.input('prefAdjective', sql.VarChar, userPreferences.adjective);
        request.input('prefNoun', sql.VarChar, userPreferences.noun);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when updating user preferences: ${err}`));
          resolve(recordset);
        });
      });
    });
  }

  getDailyGameTargets() {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.getDailyGameTargetsQuery();
      sql.connect(this.config, err => {
        if (err)
          reject(new Error(`Something went wrong connecting to db when attempting to get daily game targets: ${err}`));
        var request = new sql.Request();
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when getting daily game targets`));
          resolve(recordset.recordset || []);
        });
      });
    });
  }

  getUserDailyGames(userId) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.getUserDailyGamesQuery();
      sql.connect(this.config, err => {
        if (err)
          reject(new Error(`Something went wrong connecting to db when attempting to get user daily games: ${err}`));
        var request = new sql.Request();
        request.input('userId', sql.Int, userId);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when getting user daily games: ${err}`));
          (recordset.recordset || []).length ? resolve(recordset.recordset) : resolve(null);
        });
      });
    });
  }

  handleDailyGameGuess(userId, playerName, date) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.getUserDailyGameQuery();
      sql.connect(this.config, err => {
        if (err)
          reject(new Error(`Something went wrong connecting to db when attempting to get user daily game: ${err}`));
        var request = new sql.Request();
        request.input('userId', sql.Int, userId);
        request.input('gameDate', sql.VarChar, date);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when getting user daily game: ${err}`));
          const result = (recordset.recordset || []).length
            ? this.updateExistingUserDailyGame(recordset.recordset[0], playerName)
            : this.insertNewUserDailyGame(userId, playerName, date);
          resolve(result);
        });
      });
    });
  }

  handleDailyGameOver(gameInfo) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.getDailyGameOverQuery();
      sql.connect(this.config, err => {
        if (err)
          reject(
            new Error(`Something went wrong connecting to db when attempting to complete user daily game: ${err}`)
          );
        var request = new sql.Request();
        request.input('userId', sql.Int, gameInfo.userId);
        request.input('gameDate', sql.VarChar, gameInfo.date);
        request.input('gameWon', sql.Bit, gameInfo.gameWon);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when completing user daily game: ${err}`));
          resolve(recordset);
        });
      });
    });
  }

  updateExistingUserDailyGame(userDailyGame, playerName) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.updateExistingUserDailyGameQuery();
      sql.connect(this.config, err => {
        if (err) reject(new Error(`Something went wrong connecting to db when attempting to update user daily game`));
        var request = new sql.Request();
        let guesses = userDailyGame.guesses;
        guesses = `${guesses},${playerName}`;
        request.input('id', sql.Int, userDailyGame.id);
        request.input('guesses', sql.VarChar, guesses);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when updating existing user daily game: ${err}`));
          resolve(recordset);
        });
      });
    });
  }

  insertNewUserDailyGame(userId, playerName, date) {
    return new Promise((resolve, reject) => {
      const query = this.queryHelper.insertNewUserDailyGameQuery();
      sql.connect(this.config, err => {
        if (err)
          reject(
            new Error(`Something went wrong connecting to db when attempting to insert new user daily game: ${err}`)
          );
        var request = new sql.Request();
        const now = new Date();
        request.input('userId', sql.Int, userId);
        request.input('targetPlayerId', sql.Int, 69); // TODO: UPDATE THIS!
        request.input('gameDate', sql.VarChar, date);
        request.input('dateStarted', sql.DateTime, now);
        request.input('guesses', sql.VarChar, playerName);
        request.query(query, (err, recordset) => {
          if (err) reject(new Error(`Db error occurred when inserting new user daily game: ${err}`));
          resolve(recordset);
        });
      });
    });
  }
}

module.exports = Dbo;
