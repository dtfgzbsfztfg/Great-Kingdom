'use strict';

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commands } = require('./src/commands');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN과 CLIENT_ID를 .env 파일에 설정해주세요.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    if (GUILD_ID) {
      // 특정 서버에만 즉시 등록 (개발/테스트 시 반영이 빠름)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✅ 길드(${GUILD_ID})에 슬래시 커맨드를 등록했습니다.`);
    } else {
      // 전역 등록 (모든 서버에 반영되기까지 최대 1시간 소요될 수 있음)
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ 전역 슬래시 커맨드를 등록했습니다. (반영까지 최대 1시간 소요될 수 있습니다)');
    }
  } catch (err) {
    console.error('❌ 커맨드 등록 실패:', err);
  }
})();
