import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const USER_ID_KEY = 'yut_user_id'
const NICKNAME_KEY = 'yut_nickname'
const LEGACY_USER_ID_KEY = 'yeegames:userId'
const LEGACY_NICKNAME_KEY = 'yeegames:nickname'

const storedUserId = localStorage.getItem(USER_ID_KEY) || localStorage.getItem(LEGACY_USER_ID_KEY) || uuidv4()
const storedNickname = localStorage.getItem(NICKNAME_KEY) || localStorage.getItem(LEGACY_NICKNAME_KEY) || ''
localStorage.setItem(USER_ID_KEY, storedUserId)
localStorage.setItem(NICKNAME_KEY, storedNickname)

const userId = ref(storedUserId)
const nickname = ref(storedNickname)

export const useSession = () => {
  const setNickname = (nextNickname) => {
    nickname.value = String(nextNickname || '').trim().slice(0, 16)
    localStorage.setItem(NICKNAME_KEY, nickname.value)
  }

  return {
    userId,
    nickname,
    setNickname,
  }
}
