'use strict';

const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('king-start')
    .setDescription('그레이트 킹덤 대국을 시작합니다. (본인 = 파랑/선공, 상대 = 주황/후공)')
    .addUserOption((opt) =>
      opt.setName('상대').setDescription('대국 상대').setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('king-move')
    .setDescription('좌표에 성을 놓습니다. 예: E5')
    .addStringOption((opt) =>
      opt.setName('좌표').setDescription('예: E5 (열 A-I, 행 1-9)').setRequired(true),
    ),
  new SlashCommandBuilder().setName('king-pass').setDescription('차례를 패스합니다.'),
  new SlashCommandBuilder().setName('king-resign').setDescription('기권하여 게임을 종료합니다.'),
  new SlashCommandBuilder().setName('king-board').setDescription('현재 보드 상태를 다시 보여줍니다.'),
  new SlashCommandBuilder().setName('king-help').setDescription('그레이트 킹덤 규칙과 명령어 안내를 보여줍니다.'),
].map((c) => c.toJSON());

module.exports = { commands };
