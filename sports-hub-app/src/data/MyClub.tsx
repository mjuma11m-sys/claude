import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { getMyClub, setMyClub, type Club } from './source'

type Ctx = { club: string | null; choose: (c: Club) => Promise<void> }
const MyClubContext = createContext<Ctx>({ club: null, choose: async () => {} })

export function MyClubProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [club, setClub] = useState<string | null>(null)
  useEffect(() => {
    if (user) getMyClub(user.id).then(setClub, () => setClub(null))
    else setClub(null)
  }, [user])
  const choose = async (c: Club) => {
    if (!user) return
    await setMyClub(user.id, c)
    setClub(c.name)
  }
  return <MyClubContext value={{ club, choose }}>{children}</MyClubContext>
}

export const useMyClub = () => use(MyClubContext)
