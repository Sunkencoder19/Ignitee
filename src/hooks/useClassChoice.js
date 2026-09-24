import { useAuth } from '@/context/AuthContext'
import useLocalStorage from '@/hooks/useLocalStorage'

export const CLASS_OPTIONS = ['4A', '4B', 'all']

// Which class the teacher is looking at. Starts on their own class and is
// remembered per teacher on this device (the key includes their id), so
// Mr. Pawar on the same laptop still opens on 4B after Mrs. Deshmukh picked "All".
export default function useClassChoice() {
  const { user } = useAuth()
  const [stored, setStored] = useLocalStorage(`ignite:teacher:${user.id}:class`, user.classId)
  const classId = CLASS_OPTIONS.includes(stored) ? stored : user.classId
  return { classId, setClassId: setStored, ownClassId: user.classId }
}
