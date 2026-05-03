import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const USER_ID_KEY = 'yeegames:userId'
const NICKNAME_KEY = 'yeegames:nickname'

const storedUserId = localStorage.getItem(USER_ID_KEY) || uuidv4()
localStorage.setItem(USER_ID_KEY, storedUserId)

const userId = ref(storedUserId)
const nickname = ref(localStorage.getItem(NICKNAME_KEY) || '')

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
