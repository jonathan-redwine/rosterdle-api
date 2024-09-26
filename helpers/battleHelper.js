export default class BattleHelper {
  constructor() {}

  matchUsersInLobby = lobby => {
    const first = lobby[0];
    const second = lobby[1];
    lobby.shift();
    lobby.shift();
    return [first, second, lobby];
  };

  generateGameId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}
