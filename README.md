# 그레이트 킹덤 디스코드 봇

이세돌 디자이너의 위즈스톤 시리즈 **그레이트 킹덤(Great Kingdom)** 보드게임을
디스코드 슬래시 커맨드로 즐길 수 있는 봇입니다.

## 구현된 규칙

- 9×9 보드, 중앙에 중립성 배치
- 파랑(선공) / 주황(후공) 번갈아 착수 또는 패스
- 상대 성(연결된 그룹)을 완전히 포위(활로 0)하면 **즉시 승리**
- 빈 공간(중립성 포함)을 자신의 성·보드 가장자리로만 완전히 둘러싸면 **확정 영토**로 전환되어 이후 착수 불가
- 자충수(스스로 활로 0을 만드는 수)는 금지
- 연속 2회 패스 시 게임 종료, 확정 영토 칸 수 비교 (후공 +3 덤)로 승패 결정

> 참고: 원작의 "움직이는 중립성" 등 일부 확장/변형 룰은 포함되어 있지 않습니다.
> 기본 룰만 구현했으며, 필요하면 `src/game.js`를 확장하면 됩니다.

## 설치 방법

1. 이 폴더를 원하는 위치로 옮긴 뒤, 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. [디스코드 개발자 포털](https://discord.com/developers/applications)에서:
   - **New Application**으로 애플리케이션 생성
   - **Bot** 탭에서 봇 생성 후 **Reset Token**으로 토큰 발급
   - **OAuth2 > URL Generator**에서 `bot`, `applications.commands` 스코프와
     `Send Messages`, `Embed Links` 권한을 선택해 초대 링크 생성 후 서버에 봇 초대

3. `.env.example`을 복사해 `.env` 파일을 만들고 값을 채웁니다.

   ```bash
   cp .env.example .env
   ```

   ```env
   DISCORD_TOKEN=발급받은_봇_토큰
   CLIENT_ID=애플리케이션_ID
   GUILD_ID=테스트할_서버_ID   # 선택, 비우면 전역 등록
   ```

4. 슬래시 커맨드를 디스코드에 등록합니다. (코드를 수정할 때마다 다시 실행)

   ```bash
   npm run deploy
   ```

5. 봇을 실행합니다.

   ```bash
   npm start
   ```

## Railway로 배포하기

디스코드 봇은 웹 서버가 아니라 계속 떠 있는 백그라운드 프로세스이므로, Railway에서는
**Worker(그냥 프로세스 실행)** 형태로 배포하면 됩니다. 이 저장소에는 `railway.json`과
`Procfile`이 이미 포함되어 있어 별도 설정 없이 바로 배포할 수 있습니다.

### 방법 A: GitHub 연동 (가장 간단)

1. 이 폴더를 GitHub 저장소로 푸시합니다. (`.env`는 `.gitignore`에 이미 포함되어 있어 올라가지 않습니다.)

   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin <내_저장소_URL>
   git push -u origin main
   ```

2. [Railway](https://railway.app) 접속 → **New Project** → **Deploy from GitHub repo** → 방금 만든 저장소 선택.
3. Railway가 Node.js 프로젝트임을 자동 인식(Nixpacks)하고, `railway.json`에 정의된 대로
   `node index.js`를 시작 명령으로 사용합니다.
4. 배포된 서비스의 **Variables** 탭에서 환경변수를 등록합니다.

   | Key | Value |
   | --- | --- |
   | `DISCORD_TOKEN` | 디스코드 개발자 포털에서 발급받은 봇 토큰 |
   | `CLIENT_ID` | 애플리케이션 ID |
   | `GUILD_ID` | (선택) 테스트 서버 ID. 비우면 전역 등록 |

5. 슬래시 커맨드를 디스코드에 등록해야 합니다. **딱 한 번만** 실행하면 되며, 방법은 두 가지입니다.
   - **로컬에서 실행 (권장, 더 간단함)**: 로컬 PC에서 같은 `.env`로 `npm install && npm run deploy` 한 번 실행.
   - **Railway에서 실행**: 서비스 생성 후 Railway 대시보드의 **Settings > Deploy > Custom Start Command**를
     일시적으로 `node deploy-commands.js`로 바꿔 한 번 배포/재시작한 뒤, 다시 `node index.js`로 되돌립니다.
     (또는 Railway CLI의 `railway run node deploy-commands.js`로 실행 — 아래 방법 B 참고)
6. Variables 저장 후 자동으로 재배포되면 **Deployments** 탭 로그에서 `✅ 로그인 완료: ...` 메시지가
   뜨는지 확인합니다.

### 방법 B: Railway CLI

```bash
npm i -g @railway/cli
railway login
cd great-kingdom-bot
railway init
railway variables set DISCORD_TOKEN=발급받은_토큰 CLIENT_ID=애플리케이션_ID
# (선택) GUILD_ID도 함께 설정 가능
railway up                       # 배포
railway run node deploy-commands.js   # 슬래시 커맨드 1회 등록
```

### 주의사항

- Railway는 프로젝트에 **웹 포트를 열지 않아도** 정상 동작합니다. 이 봇은 `client.login()`으로
  디스코드 게이트웨이에 계속 연결되어 있는 방식이라 HTTP 서버가 필요 없습니다. Railway의
  기본 헬스체크(포트 확인)로 인해 "unhealthy" 표시가 뜨더라도 실제 봇 동작에는 문제가 없습니다.
  걱정되면 Settings에서 헬스체크를 비활성화해도 됩니다.
- 게임 상태는 메모리에 저장되므로, Railway가 재배포/재시작할 때마다 진행 중인 대국은 초기화됩니다.
- 슬래시 커맨드 등록(`deploy-commands.js`)은 커맨드 구조를 바꿀 때만 다시 실행하면 됩니다. 매 배포마다
  실행할 필요는 없습니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `/king-start 상대:@유저` | 대국 시작 (실행한 사람 = 파랑/선공, 지정한 상대 = 주황/후공) |
| `/king-move 좌표:E5` | 해당 좌표에 성 배치 (열 A~I, 행 1~9, 예: `E5`, `A1`, `I9`) |
| `/king-pass` | 패스 |
| `/king-resign` | 기권 |
| `/king-board` | 현재 보드 상태 다시 보기 |
| `/king-help` | 규칙 및 명령어 안내 |

## 좌표 읽는 법

```
    A B C D E F G H I
 9  . . . . . . . . .
 8  . . . . . . . . .
 7  . . . . . . . . .
 6  . . . . . . . . .
 5  . . . . N . . . .
 4  . . . . . . . . .
 3  . . . . . . . . .
 2  . . . . . . . . .
 1  . . . . . . . . .
```

- `B` / `O` : 파랑 / 주황 성
- `N` : 중립성
- `b` / `o` : 확정된 파랑 / 주황 영토
- `.` : 아직 미확정인 빈 칸

## 참고 사항 / 한계

- 게임 상태는 메모리에만 저장됩니다. 봇을 재시작하면 진행 중인 대국은 초기화됩니다.
  (영구 저장이 필요하면 `src/gameManager.js`를 SQLite/Redis 등으로 확장하세요.)
- 한 채널당 한 판만 동시에 진행할 수 있습니다.
- 중립성은 항상 중앙에 고정되어 있으며, 포획 대상이 아닙니다.

## 폴더 구조

```
great-kingdom-bot/
├── index.js              # 봇 실행 파일 (슬래시 커맨드 처리)
├── deploy-commands.js     # 슬래시 커맨드 등록 스크립트
├── src/
│   ├── game.js            # 게임 규칙/엔진 (보드, 포획, 영토 계산 등)
│   ├── gameManager.js      # 채널별 대국 상태 관리
│   ├── embeds.js           # 디스코드 임베드 메시지 생성
│   └── commands.js         # 슬래시 커맨드 정의
├── package.json
├── railway.json           # Railway 배포 설정 (start command 지정)
├── Procfile               # Railway/Heroku 호환 프로세스 정의
├── .env.example
└── README.md
```
