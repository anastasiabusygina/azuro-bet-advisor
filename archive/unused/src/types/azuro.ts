import { Condition, Participant } from '../types'

export interface Game {
  id: string
  title: string
  startsAt: number
  status: string
  sport: {
    name: string
  }
  country: {
    name: string
  }
  league: {
    name: string
  }
  participants: Participant[]
  conditions: Condition[]
}

export interface ActiveGame {
  title: string
  startsAt: string
  sport: string
}
