<script setup lang="ts">
import { computed, ref } from 'vue'

type View = 'lobby' | 'word-game'

type Game = {
  id: string
  name: string
  description: string
  players: string
}

const games: Game[] = [
  {
    id: 'word-rush',
    name: '끝말잇기',
    description: '국어사전 단어를 기준으로 앞 단어의 끝 글자를 이어가는 게임',
    players: '2-6명',
  },
  {
    id: 'drawing-guess',
    name: '그림 맞히기',
    description: '한 명이 그리고 모두가 정답을 맞히는 실시간 게임',
    players: '3-8명',
  },
  {
    id: 'quiz-battle',
    name: '퀴즈 배틀',
    description: '짧은 문제를 풀며 점수를 겨루는 순발력 게임',
    players: '2-10명',
  },
]

const koreanDictionaryWords = [
  '가방',
  '방울',
  '울음',
  '음악',
  '악기',
  '기차',
  '차표',
  '표범',
  '범인',
  '인사',
  '사과',
  '과자',
  '자전거',
  '거울',
  '울림',
  '임금',
  '금요일',
  '일기',
  '기록',
  '녹음기',
  '이름',
  '늠름',
  '름장',
  '장난감',
  '감자',
  '자두',
  '두부',
  '부엌',
  '억새',
  '새벽',
  '벽지',
  '지갑',
  '갑옷',
  '옷장',
  '장미',
  '미로',
  '노래',
  '래일',
  '일본',
  '본능',
  '능력',
  '역사',
  '사람',
  '람보',
  '보석',
  '석류',
  '유리',
  '이불',
  '불빛',
  '빛깔',
  '깔개',
  '개나리',
  '나무',
  '무지개',
  '개미',
  '미역',
  '역도',
  '도서관',
  '관람',
  '남자',
  '자동차',
  '차량',
  '양말',
  '말투',
  '투수',
  '수박',
  '박수',
  '수도',
  '도시',
  '시계',
  '계란',
  '난로',
  '노을',
  '을지로',
  '노동',
  '동물',
  '물고기',
  '기린',
  '인형',
  '형제',
  '제비',
  '비행기',
  '기름',
  '늠름함',
  '함수',
  '수첩',
  '첩자',
  '자연',
  '연필',
  '필통',
  '통장',
  '장갑',
  '갑문',
  '문어',
  '어머니',
  '이야기',
  '기분',
  '분필',
  '필름',
  '음료',
  '요리',
  '이론',
  '논리',
  '이력',
  '역량',
  '양심',
  '심리',
  '이윤',
  '윤리',
  '이륙',
  '육지',
  '지구',
  '구름',
  '늠름이',
  '이끼',
  '끼니',
  '니은',
  '은하',
  '하늘',
  '늘봄',
  '봄날',
  '날씨',
  '씨앗',
  '앗아감',
  '감기',
  '기술',
  '술래',
  '내일',
  '일상',
  '상자',
  '자물쇠',
  '쇠고기',
]

const defaultGame = games[0]!

const view = ref<View>('lobby')
const selectedGameId = ref(defaultGame.id)
const username = ref('')
const roomCode = ref('')
const statusMessage = ref('')

const currentWord = ref('')
const wordInput = ref('')
const gameMessage = ref('')
const usedWords = ref<string[]>([])
const turnCount = ref(0)

const selectedGame = computed<Game>(() => games.find((game) => game.id === selectedGameId.value) ?? defaultGame)
const normalizedRoomCode = computed(() => roomCode.value.trim().toUpperCase())
const isUsernameReady = computed(() => username.value.trim().length >= 2)
const canJoinRoom = computed(() => isUsernameReady.value && normalizedRoomCode.value.length >= 4)
const canCreateRoom = computed(() => isUsernameReady.value)
const dictionaryWords = computed(() => new Set(koreanDictionaryWords))
const requiredSyllables = computed(() => getAllowedFirstSyllables(getLastSyllable(currentWord.value)))

const usernameHint = computed(() => {
  if (!username.value) return '게임에서 사용할 이름을 입력하세요.'
  return isUsernameReady.value ? '' : '이름은 2자 이상 입력해주세요.'
})

const makeRoomCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

const getRandomWord = () => {
  return koreanDictionaryWords[Math.floor(Math.random() * koreanDictionaryWords.length)] ?? '기차'
}

const getFirstSyllable = (word: string) => word.trim()[0] ?? ''
const getLastSyllable = (word: string) => word.trim().at(-1) ?? ''

const initialSoundMap: Record<string, string[]> = {
  라: ['라', '나'],
  락: ['락', '낙'],
  란: ['란', '난'],
  람: ['람', '남'],
  랑: ['랑', '낭'],
  래: ['래', '내'],
  량: ['량', '양'],
  려: ['려', '여'],
  력: ['력', '역'],
  련: ['련', '연'],
  렬: ['렬', '열'],
  령: ['령', '영'],
  례: ['례', '예'],
  로: ['로', '노'],
  록: ['록', '녹'],
  론: ['론', '논'],
  뢰: ['뢰', '뇌'],
  료: ['료', '요'],
  룡: ['룡', '용'],
  루: ['루', '누'],
  류: ['류', '유'],
  륙: ['륙', '육'],
  륜: ['륜', '윤'],
  률: ['률', '율'],
  르: ['르', '느'],
  름: ['름', '늠', '음'],
  릉: ['릉', '능'],
  리: ['리', '이'],
  린: ['린', '인'],
  림: ['림', '임'],
  립: ['립', '입'],
}

const getAllowedFirstSyllables = (lastSyllable: string) => {
  return initialSoundMap[lastSyllable] ?? [lastSyllable]
}

const startWordGame = () => {
  const firstWord = getRandomWord()
  currentWord.value = firstWord
  usedWords.value = [firstWord]
  wordInput.value = ''
  turnCount.value = 1
  gameMessage.value = `첫 단어는 "${firstWord}"입니다.`
  view.value = 'word-game'
}

const enterRoom = (message: string) => {
  statusMessage.value = message

  if (selectedGameId.value === 'word-rush') {
    startWordGame()
    return
  }

  statusMessage.value = `${selectedGame.value.name}은 아직 준비 중입니다. 먼저 끝말잇기부터 만들고 있어요.`
}

const joinRoom = () => {
  if (!canJoinRoom.value) return

  enterRoom(`${username.value.trim()}님이 ${selectedGame.value.name} 방 ${normalizedRoomCode.value}에 입장합니다.`)
}

const createRoom = () => {
  if (!canCreateRoom.value) return

  const newRoomCode = makeRoomCode()
  roomCode.value = newRoomCode
  enterRoom(`${selectedGame.value.name} 새 방을 만들었습니다. 방 코드: ${newRoomCode}`)
}

const submitWord = () => {
  const nextWord = wordInput.value.trim()

  if (!nextWord) {
    gameMessage.value = '단어를 입력해주세요.'
    return
  }

  if (!/^[가-힣]+$/.test(nextWord)) {
    gameMessage.value = '한글 단어만 입력할 수 있습니다.'
    return
  }

  if (!dictionaryWords.value.has(nextWord)) {
    gameMessage.value = `"${nextWord}"은 현재 로컬 국어사전 데이터에 아직 없는 단어입니다.`
    return
  }

  if (usedWords.value.includes(nextWord)) {
    gameMessage.value = '이미 사용한 단어입니다.'
    return
  }

  const firstSyllable = getFirstSyllable(nextWord)

  if (!requiredSyllables.value.includes(firstSyllable)) {
    gameMessage.value = `"${currentWord.value}" 다음에는 "${requiredSyllables.value.join('" 또는 "')}"(으)로 시작해야 합니다.`
    return
  }

  currentWord.value = nextWord
  usedWords.value = [nextWord, ...usedWords.value]
  turnCount.value += 1
  wordInput.value = ''
  gameMessage.value = '좋아요. 다음 단어를 이어주세요.'
}

const leaveRoom = () => {
  view.value = 'lobby'
  wordInput.value = ''
  gameMessage.value = ''
  usedWords.value = []
  currentWord.value = ''
}
</script>

<template>
  <main v-if="view === 'lobby'" class="home-page">
    <section class="hero-section" aria-labelledby="page-title">
      <div class="brand-row">
        <div class="brand-mark">YG</div>
        <span>Yee Games</span>
      </div>

      <div class="hero-copy">
        <p class="eyebrow">No account needed</p>
        <h1 id="page-title">이름과 방 코드만 있으면 바로 플레이</h1>
        <p>로그인 없이 게임을 고르고 방을 만들거나 친구가 알려준 코드로 입장하는 구조입니다.</p>
      </div>

      <div class="preview-panel" aria-label="선택된 게임 정보">
        <span>{{ selectedGame.players }}</span>
        <strong>{{ selectedGame.name }}</strong>
        <p>{{ selectedGame.description }}</p>
      </div>
    </section>

    <section class="room-panel" aria-labelledby="room-title">
      <div class="panel-header">
        <p class="eyebrow">Start game</p>
        <h2 id="room-title">게임방 입장</h2>
      </div>

      <div class="game-list" aria-label="게임 선택">
        <button
          v-for="game in games"
          :key="game.id"
          class="game-button"
          :class="{ active: selectedGameId === game.id }"
          type="button"
          @click="selectedGameId = game.id"
        >
          <strong>{{ game.name }}</strong>
          <span>{{ game.players }}</span>
        </button>
      </div>

      <form class="room-form" @submit.prevent="joinRoom">
        <label class="field">
          <span>유저 이름</span>
          <input v-model.trim="username" type="text" autocomplete="nickname" placeholder="예: YeePlayer" />
          <small>{{ usernameHint }}</small>
        </label>

        <label class="field">
          <span>방 코드</span>
          <input
            v-model.trim="roomCode"
            type="text"
            inputmode="text"
            maxlength="8"
            placeholder="예: A7K29Q"
          />
          <small>친구가 만든 방에 들어갈 때만 입력하면 됩니다.</small>
        </label>

        <div class="action-row">
          <button class="primary-button" type="submit" :disabled="!canJoinRoom">방 입장</button>
          <button class="secondary-button" type="button" :disabled="!canCreateRoom" @click="createRoom">
            방 만들기
          </button>
        </div>
      </form>

      <p v-if="statusMessage" class="status-message" role="status">
        {{ statusMessage }}
      </p>
    </section>
  </main>

  <main v-else class="game-page">
    <header class="game-header">
      <div>
        <p class="eyebrow">{{ normalizedRoomCode || 'NEW ROOM' }}</p>
        <h1>끝말잇기</h1>
        <p>{{ username.trim() }}님의 국어사전 게임</p>
      </div>
      <button class="secondary-button compact" type="button" @click="leaveRoom">방 나가기</button>
    </header>

    <section class="play-area" aria-labelledby="current-word-title">
      <div class="word-board">
        <p id="current-word-title" class="board-label">현재 단어</p>
        <strong>{{ currentWord }}</strong>
        <span>
          다음 시작 글자:
          <b>{{ requiredSyllables.join(' / ') }}</b>
        </span>
      </div>

      <form class="word-form" @submit.prevent="submitWord">
        <label class="field">
          <span>이을 단어</span>
          <input v-model.trim="wordInput" type="text" autocomplete="off" placeholder="국어사전 단어 입력" />
          <small>현재는 내장된 로컬 단어 목록 기준으로 판정합니다.</small>
        </label>
        <button class="primary-button" type="submit">제출</button>
      </form>

      <p class="game-message" role="status">{{ gameMessage }}</p>
    </section>

    <aside class="side-panel" aria-label="게임 상태">
      <section class="rule-panel">
        <h2>적용 규칙</h2>
        <p>첫 단어는 국어사전 단어 목록에서 랜덤으로 정해집니다.</p>
        <p>두음법칙을 적용해 류/유, 력/역, 라/나 같은 시작을 허용합니다.</p>
        <p>같은 단어는 한 번만 사용할 수 있습니다.</p>
      </section>

      <section class="history-panel">
        <h2>사용한 단어 {{ turnCount }}개</h2>
        <ol>
          <li v-for="word in usedWords" :key="word">{{ word }}</li>
        </ol>
      </section>
    </aside>
  </main>
</template>

<style scoped>
.home-page,
.game-page {
  min-height: 100vh;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.12), transparent 40%),
    linear-gradient(315deg, rgba(251, 113, 133, 0.12), transparent 46%),
    #f7f8fc;
}

.home-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 460px;
}

.hero-section,
.room-panel {
  display: flex;
  flex-direction: column;
}

.hero-section {
  justify-content: space-between;
  gap: 48px;
  padding: clamp(32px, 6vw, 80px);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #121826;
  font-size: 1.1rem;
  font-weight: 900;
}

.brand-mark {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 8px;
  background: #121826;
  color: #fff;
  font-weight: 900;
}

.eyebrow {
  margin-bottom: 12px;
  color: #0f8f68;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  max-width: 760px;
  color: #121826;
  font-size: clamp(2.6rem, 6vw, 5.4rem);
  font-weight: 950;
  line-height: 1.02;
}

.hero-copy > p:last-child {
  max-width: 580px;
  margin-top: 24px;
  color: #4b5563;
  font-size: 1.08rem;
}

.preview-panel,
.rule-panel,
.history-panel {
  border: 1px solid rgba(18, 24, 38, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 52px rgba(31, 41, 55, 0.08);
}

.preview-panel {
  width: min(100%, 560px);
  padding: 20px;
}

.preview-panel span {
  display: inline-flex;
  border-radius: 999px;
  background: #e8f8f2;
  color: #087252;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 900;
}

.preview-panel strong {
  display: block;
  margin-top: 14px;
  color: #121826;
  font-size: 1.45rem;
  font-weight: 900;
}

.preview-panel p,
.rule-panel p,
.game-header p {
  color: #5b6472;
}

.room-panel {
  justify-content: center;
  border-left: 1px solid rgba(18, 24, 38, 0.08);
  background: #ffffff;
  padding: 48px;
}

.panel-header {
  margin-bottom: 28px;
}

h2 {
  color: #121826;
  font-size: 1.35rem;
  font-weight: 900;
}

.game-list {
  display: grid;
  gap: 10px;
  margin-bottom: 24px;
}

.game-button {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid #d9dee8;
  border-radius: 8px;
  background: #fbfcfe;
  color: #283246;
  cursor: pointer;
  padding: 12px 14px;
  text-align: left;
}

.game-button strong {
  font-weight: 900;
}

.game-button span {
  color: #6b7280;
  font-size: 0.88rem;
  font-weight: 800;
}

.game-button.active {
  border-color: #0f8f68;
  background: #f2fbf7;
  box-shadow: 0 0 0 4px rgba(15, 143, 104, 0.1);
}

.room-form {
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 8px;
  color: #283246;
  font-weight: 850;
}

.field input {
  width: 100%;
  height: 52px;
  border: 1px solid #d7dce5;
  border-radius: 8px;
  background: #fbfcfe;
  color: #121826;
  font: inherit;
  padding: 0 14px;
  outline: none;
}

.field input:focus {
  border-color: #0f8f68;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(15, 143, 104, 0.12);
}

.field small {
  min-height: 18px;
  color: #6b7280;
  font-size: 0.82rem;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.primary-button,
.secondary-button {
  min-height: 54px;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}

.primary-button {
  border: 0;
  background: #121826;
  color: #ffffff;
}

.secondary-button {
  border: 1px solid #121826;
  background: #ffffff;
  color: #121826;
}

.compact {
  min-height: 42px;
  padding: 0 16px;
}

.primary-button:hover:not(:disabled) {
  background: #0f8f68;
}

.secondary-button:hover:not(:disabled) {
  border-color: #0f8f68;
  color: #0f8f68;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.status-message,
.game-message {
  border-radius: 8px;
  background: #e9fbf4;
  color: #087252;
  padding: 13px 14px;
  font-weight: 800;
}

.status-message {
  margin-top: 22px;
}

.game-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  padding: clamp(20px, 4vw, 48px);
}

.game-header {
  display: flex;
  grid-column: 1 / -1;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.game-header h1 {
  font-size: clamp(2.4rem, 5vw, 4.6rem);
}

.play-area {
  display: grid;
  align-content: start;
  gap: 18px;
}

.word-board {
  display: grid;
  min-height: 280px;
  place-items: center;
  border-radius: 8px;
  background: #121826;
  color: #ffffff;
  padding: 32px;
  text-align: center;
}

.word-board strong {
  font-size: clamp(3rem, 9vw, 7rem);
  font-weight: 950;
  line-height: 1;
}

.word-board span,
.board-label {
  color: rgba(255, 255, 255, 0.78);
  font-weight: 800;
}

.word-board b {
  color: #6ee7b7;
  font-weight: 950;
}

.word-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  align-items: end;
  gap: 12px;
}

.side-panel {
  display: grid;
  align-content: start;
  gap: 16px;
}

.rule-panel,
.history-panel {
  padding: 18px;
}

.rule-panel p {
  margin-top: 10px;
}

.history-panel ol {
  display: grid;
  max-height: 360px;
  gap: 8px;
  margin-top: 14px;
  overflow: auto;
  padding-left: 24px;
}

.history-panel li {
  color: #283246;
  font-weight: 800;
}

@media (max-width: 920px) {
  .home-page,
  .game-page {
    grid-template-columns: 1fr;
  }

  .hero-section {
    min-height: 48vh;
    padding: 32px 24px;
  }

  .room-panel {
    border-left: 0;
    border-top: 1px solid rgba(18, 24, 38, 0.08);
    padding: 34px 24px 42px;
  }

  .game-header {
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  h1 {
    font-size: 2.35rem;
  }

  .action-row,
  .word-form {
    grid-template-columns: 1fr;
  }
}
</style>
