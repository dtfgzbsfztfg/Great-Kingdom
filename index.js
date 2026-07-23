'use strict';

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const gameManager = require('./src/gameManager');
const { statusEmbed, scoreLines } = require('./src/embeds');
const { parsePosition, colorName, BLUE, ORANGE } = require('./src/game');

const { DISCORD_TOKEN } = process.env;
if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN이 .env 파일에 설정되어 있지 않습니다.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(`✅ 로그인 완료: ${client.user.tag}`);
});

const HELP_TEXT = [
  '**🏯 그레이트 킹덤 (Great Kingdom) — 위즈스톤 시리즈 (디자이너: 이세돌)**',
  '',
  '9x9 보드 위에 번갈아 성을 놓아 영토를 넓히거나 상대의 성을 포위하는 추상 전략 게임입니다.',
  '',
  '**규칙 요약**',
  '• 중앙에는 누구도 소유하지 않는 중립성(N)이 놓여 있습니다.',
  '• 파랑(선공)과 주황(후공)이 번갈아 성을 하나씩 놓거나 패스합니다.',
  '• 상대 성(연결된 그룹 포함)을 사방으로 완전히 둘러싸면(활로 0) **즉시 승리**합니다.',
  '• 빈 공간을 자신의 성과 보드 가장자리만으로 완전히 둘러싸면(중립성을 포함해도 무방) 그 공간은 **확정 영토**가 되어 이후 아무도 그곳에 착수할 수 없습니다.',
  '• 두 플레이어가 연속으로 패스하면 게임이 끝나고, 확정 영토 칸 수를 비교합니다.',
  '• 후공(주황)은 밸런스를 위해 영토 **+3 덤**을 받습니다.',
  '',
  '**명령어**',
  '`/king-start 상대:@유저` — 대국 시작 (본인=파랑/선공, 상대=주황/후공)',
  '`/king-move 좌표:E5` — 좌표에 성 놓기 (열 A~I, 행 1~9)',
  '`/king-pass` — 패스',
  '`/king-resign` — 기권',
  '`/king-board` — 현재 보드 다시 보기',
].join('\n');

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, channelId, user } = interaction;

  try {
    if (commandName === 'king-help') {
      const embed = new EmbedBuilder().setTitle('도움말').setDescription(HELP_TEXT).setColor(0x2ecc71);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (commandName === 'king-start') {
      const opponent = interaction.options.getUser('상대', true);
      if (opponent.bot) {
        await interaction.reply({ content: '봇과는 대국할 수 없습니다. 다른 사용자를 지정해주세요.', ephemeral: true });
        return;
      }
      const result = gameManager.start(channelId, user.id, user.username, opponent.id, opponent.username);
      if (!result.ok) {
        await interaction.reply({ content: `⚠️ ${result.error}`, ephemeral: true });
        return;
      }
      const embed = statusEmbed(result.entry, `대국이 시작되었습니다! <@${user.id}>(파랑) vs <@${opponent.id}>(주황)`);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // 아래 커맨드들은 모두 진행 중인 게임이 필요함
    const entry = gameManager.get(channelId);
    if (!entry) {
      await interaction.reply({
        content: '⚠️ 이 채널에는 진행 중인 게임이 없습니다. `/king-start 상대:@유저`로 시작해주세요.',
        ephemeral: true,
      });
      return;
    }

    if (commandName === 'king-board') {
      const embed = statusEmbed(entry);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const myColor = gameManager.colorOf(entry, user.id);
    if (!myColor) {
      await interaction.reply({ content: '⚠️ 이 대국의 참가자가 아닙니다.', ephemeral: true });
      return;
    }

    if (commandName === 'king-move') {
      const posStr = interaction.options.getString('좌표', true);
      const pos = parsePosition(posStr);
      if (!pos) {
        await interaction.reply({
          content: '⚠️ 좌표 형식이 올바르지 않습니다. 예: `E5` (열 A~I, 행 1~9)',
          ephemeral: true,
        });
        return;
      }

      const result = entry.game.place(myColor, pos.row, pos.col);
      if (!result.legal) {
        await interaction.reply({ content: `⚠️ ${result.error}`, ephemeral: true });
        return;
      }

      let extra = `<@${user.id}> (${colorName(myColor)})가 **${posStr.toUpperCase()}**에 성을 놓았습니다.`;
      if (result.gameOver && result.winReason === 'capture') {
        extra += `\n💥 상대 성 ${result.captured.length}개(${result.captured.join(', ')})를 포위하여 포획! 즉시 승리합니다.`;
      } else if (result.claimedTerritory && result.claimedTerritory.length > 0) {
        const desc = result.claimedTerritory
          .map((cl) => `${colorName(cl.owner)} 영토 확정 (${cl.cells.length}칸)`)
          .join(', ');
        extra += `\n🏳️ ${desc}`;
      }

      const embed = statusEmbed(entry, extra);
      await interaction.reply({ embeds: [embed] });

      if (entry.game.finished) {
        gameManager.end(channelId);
      }
      return;
    }

    if (commandName === 'king-pass') {
      const result = entry.game.pass(myColor);
      if (!result.legal) {
        await interaction.reply({ content: `⚠️ ${result.error}`, ephemeral: true });
        return;
      }

      let extra = `<@${user.id}> (${colorName(myColor)})가 패스했습니다.`;
      if (result.gameOver) {
        extra += `\n\n**최종 결과**\n${scoreLines(result.scores)}`;
      }

      const embed = statusEmbed(entry, extra);
      await interaction.reply({ embeds: [embed] });

      if (entry.game.finished) {
        gameManager.end(channelId);
      }
      return;
    }

    if (commandName === 'king-resign') {
      const result = entry.game.resign(myColor);
      if (!result.legal) {
        await interaction.reply({ content: `⚠️ ${result.error}`, ephemeral: true });
        return;
      }
      const embed = statusEmbed(entry, `<@${user.id}> (${colorName(myColor)})가 기권했습니다.`);
      await interaction.reply({ embeds: [embed] });
      gameManager.end(channelId);
      return;
    }
  } catch (err) {
    console.error(err);
    const content = '⚠️ 처리 중 오류가 발생했습니다.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
