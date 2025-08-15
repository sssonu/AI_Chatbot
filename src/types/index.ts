export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
}

export interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
  user_id: string
  messages?: Message[]
}

export interface Message {
  id: string
  content: string
  is_bot: boolean
  created_at: string
  chat_id: string
  user_id: string
}

export interface ChatbotResponse {
  success: boolean
  message: string
  response?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}
