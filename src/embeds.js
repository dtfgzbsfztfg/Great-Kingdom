'use strict';

const { EmbedBuilder } = require('discord.js');
const { BLUE, ORANGE, colorName } = require('./game');

const BLUE_COLOR = 0x3498db;
const ORANGE_COLOR = 0xe67e22;
const NEUTRAL_COLOR = 0x95a5a6;

function nameFor(entry, color) {
  return color === BLUE ? entry.blueName : entry.orangeName;
}

function statusEmbed(entry, extraDescription) {
  const { game } = entry;
  const embed = new EmbedBuilder()
    .setTitle('🏯 그레이트 킹덤 (Great Kingdom)')
    .setDescription(game.render())
    .addFields(
      { name: '파랑 (선공)', value: `<@${entry.blueId}>`, inline: true },
      { name: '주황 (후공, 덤 +3)', value: `<@${entry.orangeId}>`, inline: true },
    );

  if (extraDescription) {
    embed.addFields({ name: '\u200B', value: extraDescription });
  }

  if (game.finished) {
    embed.setColor(NEUTRAL_COLOR);
    const winnerName = game.winner ? nameFor(entry, game.winner) : null;
    let reasonText;
    if (game.winReason === 'capture') reasonText = '상대 성을 포위하여 포획 승리!';
    else if (game.winReason === 'resign') reasonText = '기권으로 승리';
    else reasonText = '영토 계산 결과 승리';
    embed.addFields({
      name: '🏁 게임 종료',
      value: game.winner
        ? `**${colorName(game.winner)} (${winnerName})** 승리! (${reasonText})`
        : `무승부입니다. (${reasonText})`,
    });
  } else {
    embed.setColor(game.turn === BLUE ? BLUE_COLOR : ORANGE_COLOR);
    embed.addFields({
      name: '차례',
      value: `**${colorName(game.turn)} (${nameFor(entry, game.turn)})** 님 차례입니다.\n\`/king-move position:E5\` 처럼 좌표를 입력해 성을 놓거나, \`/king-pass\`로 패스하세요.`,
    });
  }

  embed.setFooter({ text: '위즈스톤 시리즈 · 이세돌 디자인 · 코리아보드게임즈' });
  return embed;
}

function scoreLines(scores) {
  return [
    `파랑 영토: **${scores.blueTerritory}**`,
    `주황 영토: **${scores.orangeTerritory}** (+${scores.komi} 덤 = ${scores.orangeTotal})`,
  ].join('\n');
}

module.exports = { statusEmbed, scoreLines, BLUE_COLOR, ORANGE_COLOR };
