import { gql } from '@apollo/client'

// Chat Queries
export const GET_CHATS = gql`
  query GetChats {
    chats(order_by: { updated_at: desc }) {
      id
      title
      created_at
      updated_at
    }
  }
`

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($chatId: uuid!) {
    messages(
      where: { chat_id: { _eq: $chatId } }
      order_by: { created_at: asc }
    ) {
      id
      content
      is_bot
      created_at
      user_id
    }
  }
`

// Chat Mutations
export const CREATE_CHAT = gql`
  mutation CreateChat($title: String!) {
    insert_chats_one(object: { title: $title }) {
      id
      title
      created_at
      updated_at
    }
  }
`

export const UPDATE_CHAT = gql`
  mutation UpdateChat($id: uuid!, $title: String) {
    update_chats_by_pk(pk_columns: { id: $id }, _set: { title: $title }) {
      id
      title
      updated_at
    }
  }
`

export const DELETE_CHAT = gql`
  mutation DeleteChat($id: uuid!) {
    delete_chats_by_pk(id: $id) {
      id
    }
  }
`

// Message Mutations
export const SEND_MESSAGE = gql`
  mutation SendMessage($chatId: uuid!, $content: String!) {
    insert_messages_one(
      object: { chat_id: $chatId, content: $content, is_bot: false }
    ) {
      id
      content
      is_bot
      created_at
      chat_id
    }
  }
`

// Message Subscriptions
export const MESSAGES_SUBSCRIPTION = gql`
  subscription MessagesSubscription($chatId: uuid!) {
    messages(
      where: { chat_id: { _eq: $chatId } }
      order_by: { created_at: asc }
    ) {
      id
      content
      is_bot
      created_at
      user_id
    }
  }
`

// Hasura Action for Chatbot
export const SEND_CHATBOT_MESSAGE = gql`
  mutation SendChatbotMessage($chatId: String!, $message: String!) {
    sendChatbotMessage(chatId: $chatId, message: $message)
  }
`
