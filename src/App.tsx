import React, { useState } from 'react'
import { useAuthenticationStatus } from '@nhost/react'
import { NhostProvider } from '@nhost/react'
import { ApolloProvider } from '@apollo/client'
import { nhost } from './lib/nhost'
import { apolloClient } from './lib/apollo'
import { AuthForm } from './components/AuthForm'
import { ChatSidebar } from './components/ChatSidebar'
import { ChatWindow } from './components/ChatWindow'
import { LogOut } from 'lucide-react'

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthenticationStatus()
  const [selectedChatId, setSelectedChatId] = useState<string>('')

  const handleSignOut = async () => {
    await nhost.auth.signOut()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthForm />
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Header */}
      <div className="absolute top-0 right-0 p-4 z-10">
        <button
          onClick={handleSignOut}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Sidebar */}
      <ChatSidebar
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
      />

      {/* Main Chat Area */}
      <ChatWindow chatId={selectedChatId} />
    </div>
  )
}

const App: React.FC = () => {
  return (
    <NhostProvider nhost={nhost}>
      <ApolloProvider client={apolloClient}>
        <AppContent />
      </ApolloProvider>
    </NhostProvider>
  )
}

export default App
