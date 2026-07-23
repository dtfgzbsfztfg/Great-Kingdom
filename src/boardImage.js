'use strict';

const sharp = require('sharp');
const { BLUE, ORANGE, NEUTRAL, EMPTY } = require('./game');

const CELL = 48; // 칸 간격(px)
const MARGIN = 42; // 바깥 여백(px, 좌표 라벨 공간 포함)

const COLORS = {
  bg: '#f2d9a8',
  boardBorder: '#8a5a2b',
  line: '#5a3d1e',
  label: '#5a3d1e',
  blueStone: '#3b6fe0',
  blueStoneStroke: '#1e3f8f',
  orangeStone: '#e8821f',
  orangeStoneStroke: '#9a520f',
  neutralStone: '#8a8f94',
  neutralStoneStroke: '#4b4f52',
  blueTerritory: 'rgba(59,111,224,0.32)',
  orangeTerritory: 'rgba(232,130,31,0.32)',
  lastMoveRing: '#e74c3c',
};

function px(i) {
  return MARGIN + i * CELL;
}

/** 게임 상태로부터 SVG 마크업 문자열을 생성 */
function buildBoardSVG(game) {
  const size = game.size;
  const boardPx = CELL * (size - 1);
  const imgSize = boardPx + MARGIN * 2;
  const cols = 'ABCDEFGHI'.slice(0, size);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imgSize}" height="${imgSize}" viewBox="0 0 ${imgSize} ${imgSize}">`,
  );
  parts.push(`<rect x="0" y="0" width="${imgSize}" height="${imgSize}" fill="${COLORS.bg}" rx="14" />`);
  parts.push(
    `<rect x="${MARGIN - 14}" y="${MARGIN - 14}" width="${boardPx + 28}" height="${boardPx + 28}" fill="none" stroke="${COLORS.boardBorder}" stroke-width="3" rx="6" />`,
  );

  // 좌표 라벨
  for (let c = 0; c < size; c++) {
    const x = px(c);
    parts.push(
      `<text x="${x}" y="${MARGIN - 20}" font-size="15" text-anchor="middle" fill="${COLORS.label}" font-family="Verdana, sans-serif">${cols[c]}</text>`,
    );
  }
  for (let r = 0; r < size; r++) {
    const y = px(r) + 5;
    const rowNum = size - r;
    parts.push(
      `<text x="${MARGIN - 24}" y="${y}" font-size="15" text-anchor="middle" fill="${COLORS.label}" font-family="Verdana, sans-serif">${rowNum}</text>`,
    );
  }

  // 격자선
  for (let i = 0; i < size; i++) {
    const x = px(i);
    const y = px(i);
    parts.push(`<line x1="${x}" y1="${px(0)}" x2="${x}" y2="${px(size - 1)}" stroke="${COLORS.line}" stroke-width="1.5" />`);
    parts.push(`<line x1="${px(0)}" y1="${y}" x2="${px(size - 1)}" y2="${y}" stroke="${COLORS.line}" stroke-width="1.5" />`);
  }

  // 확정 영토 음영 (돌보다 먼저 그려서 아래에 깔리도록)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const owner = game.territory[r][c];
      if (owner === BLUE || owner === ORANGE) {
        const cx = px(c);
        const cy = px(r);
        const fill = owner === BLUE ? COLORS.blueTerritory : COLORS.orangeTerritory;
        parts.push(
          `<rect x="${cx - CELL / 2}" y="${cy - CELL / 2}" width="${CELL}" height="${CELL}" fill="${fill}" />`,
        );
      }
    }
  }

  // 성(돌) 그리기
  const radius = CELL * 0.42;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = game.board[r][c];
      if (val === EMPTY) continue;
      const cx = px(c);
      const cy = px(r);
      let fill;
      let stroke;
      if (val === BLUE) {
        fill = COLORS.blueStone;
        stroke = COLORS.blueStoneStroke;
      } else if (val === ORANGE) {
        fill = COLORS.orangeStone;
        stroke = COLORS.orangeStoneStroke;
      } else {
        fill = COLORS.neutralStone;
        stroke = COLORS.neutralStoneStroke;
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" />`);
      // 색상만으로 구분이 어려운 경우(색약 등)를 대비해 성 위에 글자도 함께 표시
      let label = null;
      if (val === BLUE) label = 'B';
      else if (val === ORANGE) label = 'O';
      else if (val === NEUTRAL) label = 'N';
      if (label) {
        parts.push(
          `<text x="${cx}" y="${cy + 5}" font-size="13" font-weight="bold" text-anchor="middle" fill="white" font-family="Verdana, sans-serif">${label}</text>`,
        );
      }
    }
  }

  // 마지막 착수 표시
  if (game.lastMove) {
    const { r, c } = game.lastMove;
    const cx = px(c);
    const cy = px(r);
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${radius * 0.42}" fill="none" stroke="${COLORS.lastMoveRing}" stroke-width="2.5" />`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

/** SVG를 PNG 버퍼로 변환 (디스코드 임베드 첨부용) */
async function renderBoardPNG(game) {
  const svg = buildBoardSVG(game);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { buildBoardSVG, renderBoardPNG };
