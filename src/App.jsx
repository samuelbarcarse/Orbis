import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import PageNotFound from './lib/PageNotFound';

import Dashboard from './pages/Dashboard';

const SignInPage = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Orbis</h1>
        <p className="text-sm text-muted-foreground mt-1">Illegal Fishing Intelligence Platform</p>
      </div>
      <SignIn routing="hash" />
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <SignedOut>
          <SignInPage />
        </SignedOut>
        <SignedIn>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </SignedIn>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
