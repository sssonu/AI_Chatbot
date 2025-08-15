import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, MessageCircle, Trash2, Edit2 } from 'lucide-react'
import { GET_CHATS, CREATE_CHAT, DELETE_CHAT } from '../graphql/queries'
import { Chat } from '../types'

interface ChatSidebarProps {
  selectedChatId?: string
  onSelectChat: (chatId: string) => void
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  selectedChatId,
  onSelectChat,
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [newChatTitle, setNewChatTitle] = useState('')

  const { data, loading, refetch } = useQuery(GET_CHATS, {
    pollInterval: 2000, // Poll every 2 seconds to keep chat list updated
    errorPolicy: 'all',
  })
  const [createChat] = useMutation(CREATE_CHAT)
  const [deleteChat] = useMutation(DELETE_CHAT)

  const chats: Chat[] = data?.chats || []

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChatTitle.trim()) return

    try {
      const result = await createChat({
        variables: { title: newChatTitle.trim() },
        refetchQueries: [{ query: GET_CHATS }],
        awaitRefetchQueries: true,
      })
      
      if (result.data?.insert_chats_one) {
        onSelectChat(result.data.insert_chats_one.id)
        setNewChatTitle('')
        setIsCreating(false)
        // Force refetch to ensure chat list updates
        await refetch()
      }
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this chat?')) return

    try {
      await deleteChat({
        variables: { id: chatId },
      })
      refetch()
      if (selectedChatId === chatId) {
        onSelectChat('')
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        
        {isCreating && (
          <form onSubmit={handleCreateChat} className="mt-3">
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder="Chat title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              onBlur={() => {
                if (!newChatTitle.trim()) {
                  setIsCreating(false)
                }
              }}
            />
          </form>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs mt-1">Create your first chat to get started</p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 ${
                selectedChatId === chat.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {chat.title}
                  </h3>
                  {chat.messages && chat.messages.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {chat.messages[0].is_bot ? '🤖 ' : '👤 '}
                      {chat.messages[0].content}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
