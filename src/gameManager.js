'use strict';

const { GreatKingdom, BLUE, ORANGE } = require('./game');

/**
 * 채널 ID -> 게임 세션 매핑을 메모리에 보관합니다.
 * (봇을 재시작하면 초기화됩니다. 영구 저장이 필요하면 DB/파일로 확장하세요.)
 */
class GameManager {
  constructor() {
    /** @type {Map<string, {game: GreatKingdom, blueId: string, blueName: string, orangeId: string, orangeName: string}>} */
    this.games = new Map();
  }

  start(channelId, blueId, blueName, orangeId, orangeName) {
    const existing = this.games.get(channelId);
    if (existing && !existing.game.finished) {
      return { ok: false, error: '이 채널에는 이미 진행 중인 게임이 있습니다. `/king-resign` 또는 게임 종료 후 다시 시작해주세요.' };
    }
    if (blueId === orangeId) {
      return { ok: false, error: '본인과 대국할 수 없습니다. 다른 상대를 지정해주세요.' };
    }
    const game = new GreatKingdom();
    const entry = { game, blueId, blueName, orangeId, orangeName };
    this.games.set(channelId, entry);
    return { ok: true, entry };
  }

  get(channelId) {
    return this.games.get(channelId) || null;
  }

  colorOf(entry, userId) {
    if (!entry) return null;
    if (entry.blueId === userId) return BLUE;
    if (entry.orangeId === userId) return ORANGE;
    return null;
  }

  end(channelId) {
    this.games.delete(channelId);
  }
}

module.exports = new GameManager();
