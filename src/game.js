'use strict';

/**
 * 그레이트 킹덤 (Great Kingdom) 게임 엔진
 * 디자이너: 이세돌 / 위즈스톤 시리즈 (코리아보드게임즈)
 *
 * 규칙 요약:
 *  - 9x9 보드, 정중앙에 중립성(Neutral Castle) 배치
 *  - 선공(파랑) / 후공(주황) 이 번갈아 성을 하나씩 배치하거나 패스
 *  - 상대 성(그룹)을 완전히 둘러싸(활로 0) 잡으면 그 즉시 승리
 *  - 빈 공간(중립성 포함)을 자신의 성/보드 가장자리로만 완전히 둘러싸면
 *    그 공간은 해당 플레이어의 "확정 영토"가 되며, 이후 누구도 착수 불가
 *  - 두 플레이어가 연속으로 패스하면 게임 종료
 *  - 확정 영토 칸 수를 비교하여, 더 많은 쪽이 승리
 *    (후공은 초심자 밸런스를 위해 영토 +3 덤을 받음)
 */

const SIZE = 9;
const EMPTY = 0;
const BLUE = 1;
const ORANGE = 2;
const NEUTRAL = 3;
const KOMI = 3; // 후공(주황) 덤

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function otherColor(color) {
  return color === BLUE ? ORANGE : BLUE;
}

function colorName(color) {
  if (color === BLUE) return '파랑';
  if (color === ORANGE) return '주황';
  if (color === NEUTRAL) return '중립';
  return '빈칸';
}

/** "E5" 같은 좌표 문자열을 {row, col} 배열 인덱스로 변환 (A-I, 1-9) */
function parsePosition(pos, size = SIZE) {
  if (typeof pos !== 'string') return null;
  const m = pos.trim().toUpperCase().match(/^([A-I])([1-9])$/);
  if (!m) return null;
  const col = m[1].charCodeAt(0) - 65; // A=0 .. I=8
  const rowNum = parseInt(m[2], 10); // 1(맨 아래) ~ 9(맨 위)
  if (rowNum < 1 || rowNum > size) return null;
  const row = size - rowNum; // 배열 내부 행 인덱스 (0=맨 위)
  return { row, col };
}

/** 내부 좌표를 다시 "E5" 형태 문자열로 */
function toPositionLabel(row, col, size = SIZE) {
  const colLetter = String.fromCharCode(65 + col);
  const rowNum = size - row;
  return `${colLetter}${rowNum}`;
}

class GreatKingdom {
  constructor() {
    this.size = SIZE;
    this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    // territory: 0=미확정, BLUE/ORANGE=확정된 영토 소유자
    this.territory = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    const c = Math.floor(SIZE / 2);
    this.board[c][c] = NEUTRAL;
    this.centerCell = [c, c];

    this.turn = BLUE; // 파랑(선공) 먼저 시작
    this.passCount = 0;
    this.finished = false;
    this.winner = null; // BLUE | ORANGE | null(무승부)
    this.winReason = null; // 'capture' | 'territory' | 'resign'
    this.lastMove = null;
    this.moveHistory = [];
  }

  inBounds(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  neighbors(r, c) {
    const res = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (this.inBounds(nr, nc)) res.push([nr, nc]);
    }
    return res;
  }

  isPlayable(r, c) {
    if (!this.inBounds(r, c)) return false;
    if (this.board[r][c] !== EMPTY) return false;
    if (this.territory[r][c] !== 0) return false;
    return true;
  }

  /** color 색상의 (r,c)를 포함하는 연결된 그룹과, 그 그룹의 활로(빈 칸) 집합을 반환 */
  groupAndLiberties(r, c, color) {
    const key = (rr, cc) => rr + ',' + cc;
    const visited = new Set([key(r, c)]);
    const group = [[r, c]];
    const liberties = new Set();
    const stack = [[r, c]];

    while (stack.length) {
      const [cr, cc] = stack.pop();
      for (const [nr, nc] of this.neighbors(cr, cc)) {
        const val = this.board[nr][nc];
        const k = key(nr, nc);
        if (val === color) {
          if (!visited.has(k)) {
            visited.add(k);
            group.push([nr, nc]);
            stack.push([nr, nc]);
          }
        } else if (val === EMPTY && this.territory[nr][nc] === 0) {
          // 확정되지 않은 빈 칸만 활로로 인정 (중립성/상대 성/확정영토는 활로 아님)
          liberties.add(k);
        }
      }
    }
    return { group, liberties };
  }

  /**
   * 성 배치 시도.
   * 반환값: { legal, error?, gameOver?, winner?, winReason?, captured?, claimedTerritory? }
   */
  place(playerColor, r, c) {
    if (this.finished) return { legal: false, error: '게임이 이미 종료되었습니다.' };
    if (playerColor !== this.turn) return { legal: false, error: '당신의 차례가 아닙니다.' };
    if (!this.inBounds(r, c)) return { legal: false, error: '보드 범위를 벗어난 좌표입니다.' };
    if (this.board[r][c] !== EMPTY || this.territory[r][c] !== 0) {
      return { legal: false, error: '이미 성이 있거나 확정된 영토라 둘 수 없습니다.' };
    }

    // 임시로 착수
    this.board[r][c] = playerColor;
    const opponent = otherColor(playerColor);

    // 1) 상대 그룹 포획(즉시 승리) 체크
    const checked = new Set();
    let capturedGroup = null;
    for (const [nr, nc] of this.neighbors(r, c)) {
      if (this.board[nr][nc] === opponent) {
        const k = nr + ',' + nc;
        if (checked.has(k)) continue;
        const { group, liberties } = this.groupAndLiberties(nr, nc, opponent);
        for (const [gr, gc] of group) checked.add(gr + ',' + gc);
        if (liberties.size === 0) {
          capturedGroup = group;
          break;
        }
      }
    }

    if (capturedGroup) {
      this.finished = true;
      this.winner = playerColor;
      this.winReason = 'capture';
      this.lastMove = { color: playerColor, r, c };
      this.moveHistory.push({ color: playerColor, pos: toPositionLabel(r, c, this.size) });
      return {
        legal: true,
        gameOver: true,
        winner: playerColor,
        winReason: 'capture',
        captured: capturedGroup.map(([gr, gc]) => toPositionLabel(gr, gc, this.size)),
      };
    }

    // 2) 자충수(자살수) 금지: 방금 둔 돌이 속한 그룹의 활로가 0이면 무효
    const { liberties: myLiberties } = this.groupAndLiberties(r, c, playerColor);
    if (myLiberties.size === 0) {
      this.board[r][c] = EMPTY; // 되돌리기
      return { legal: false, error: '자충수(활로 0)는 둘 수 없습니다.' };
    }

    // 3) 영토 확정 체크
    const claimedTerritory = this.detectTerritory();

    this.lastMove = { color: playerColor, r, c };
    this.moveHistory.push({ color: playerColor, pos: toPositionLabel(r, c, this.size) });
    this.passCount = 0;
    this.turn = opponent;

    return {
      legal: true,
      gameOver: false,
      claimedTerritory: claimedTerritory.map((cl) => ({
        owner: cl.owner,
        cells: cl.region.map(([rr, cc]) => toPositionLabel(rr, cc, this.size)),
      })),
    };
  }

  /** 보드 전체를 스캔하여, 한 색으로만 둘러싸인 빈 영역을 확정 영토로 전환 */
  detectTerritory() {
    // 두 플레이어 모두 보드에 성이 하나도 없다면(=아직 한쪽만 두었거나 둘 다 안 둔 상태)
    // "보드 전체가 비어있어서 우연히 한 색만 인접해 있는" 상태를 영토로 오판하지 않도록
    // 아직 판정을 하지 않는다. (예: 첫 수를 두자마자 보드 전체가 영토로 확정되는 것을 방지)
    let hasBlue = false;
    let hasOrange = false;
    for (let r = 0; r < this.size && !(hasBlue && hasOrange); r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === BLUE) hasBlue = true;
        else if (this.board[r][c] === ORANGE) hasOrange = true;
        if (hasBlue && hasOrange) break;
      }
    }
    if (!hasBlue || !hasOrange) return [];

    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const claimed = [];

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (visited[r][c]) continue;
        if (this.territory[r][c] !== 0) {
          visited[r][c] = true;
          continue;
        }
        const val = this.board[r][c];
        if (val !== EMPTY && val !== NEUTRAL) {
          visited[r][c] = true;
          continue;
        }

        // BFS로 연결된 "열린 칸"(빈칸+중립성) 영역 찾기
        const region = [];
        const borders = new Set(); // 이 영역과 맞닿은 색 (BLUE/ORANGE)
        const stack = [[r, c]];
        visited[r][c] = true;

        while (stack.length) {
          const [cr, cc] = stack.pop();
          region.push([cr, cc]);
          for (const [nr, nc] of this.neighbors(cr, cc)) {
            if (this.territory[nr][nc] !== 0) {
              borders.add(this.territory[nr][nc]);
              continue;
            }
            const nval = this.board[nr][nc];
            if (nval === EMPTY || nval === NEUTRAL) {
              if (!visited[nr][nc]) {
                visited[nr][nc] = true;
                stack.push([nr, nc]);
              }
            } else {
              borders.add(nval); // BLUE 또는 ORANGE 성
            }
          }
        }

        if (borders.size === 1) {
          const owner = [...borders][0];
          for (const [rr, cc] of region) this.territory[rr][cc] = owner;
          claimed.push({ owner, region });
        }
        // borders.size === 0 (보드 전체가 비어있는 경우) 또는 2 (양쪽 다 접함) 이면 미확정
      }
    }

    return claimed;
  }

  pass(playerColor) {
    if (this.finished) return { legal: false, error: '게임이 이미 종료되었습니다.' };
    if (playerColor !== this.turn) return { legal: false, error: '당신의 차례가 아닙니다.' };

    this.passCount++;
    this.moveHistory.push({ color: playerColor, pos: 'PASS' });
    const opponent = otherColor(playerColor);

    if (this.passCount >= 2) {
      this.finished = true;
      this.detectTerritory(); // 종료 시점 최종 영토 재판정 (안전망)
      const scores = this.calculateScore();
      this.winner = scores.winner;
      this.winReason = 'territory';
      return { legal: true, gameOver: true, winner: scores.winner, winReason: 'territory', scores };
    }

    this.turn = opponent;
    return { legal: true, gameOver: false };
  }

  resign(playerColor) {
    if (this.finished) return { legal: false, error: '게임이 이미 종료되었습니다.' };
    this.finished = true;
    this.winner = otherColor(playerColor);
    this.winReason = 'resign';
    return { legal: true, gameOver: true, winner: this.winner, winReason: 'resign' };
  }

  calculateScore() {
    let blueTerritory = 0;
    let orangeTerritory = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.territory[r][c] === BLUE) blueTerritory++;
        if (this.territory[r][c] === ORANGE) orangeTerritory++;
      }
    }
    const orangeTotal = orangeTerritory + KOMI;
    let winner = null;
    if (blueTerritory > orangeTotal) winner = BLUE;
    else if (orangeTotal > blueTerritory) winner = ORANGE;
    return { blueTerritory, orangeTerritory, komi: KOMI, orangeTotal, winner };
  }

  /** 텍스트(모노스페이스) 보드 렌더링 */
  render() {
    const cols = 'ABCDEFGHI';
    const lines = [];
    lines.push('    ' + cols.split('').join(' '));
    for (let r = 0; r < this.size; r++) {
      const rowNum = this.size - r;
      let row = String(rowNum).padStart(2, ' ') + '  ';
      for (let c = 0; c < this.size; c++) {
        let ch = '.';
        if (this.territory[r][c] === BLUE) ch = 'b';
        else if (this.territory[r][c] === ORANGE) ch = 'o';
        else if (this.board[r][c] === BLUE) ch = 'B';
        else if (this.board[r][c] === ORANGE) ch = 'O';
        else if (this.board[r][c] === NEUTRAL) ch = 'N';
        row += ch + ' ';
      }
      lines.push(row);
    }
    lines.push('');
    lines.push('B/O = 파랑/주황 성   N = 중립성   b/o = 확정 영토(파랑/주황)   . = 빈 칸');
    return '```\n' + lines.join('\n') + '\n```';
  }
}

module.exports = {
  GreatKingdom,
  SIZE,
  EMPTY,
  BLUE,
  ORANGE,
  NEUTRAL,
  KOMI,
  parsePosition,
  toPositionLabel,
  colorName,
  otherColor,
};
