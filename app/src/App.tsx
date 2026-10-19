import { AppShell } from './components/AppShell/AppShell.tsx'
import { TaskStoreProvider } from './state/TaskStoreProvider.tsx'
import { ToastProvider } from './state/ToastProvider.tsx'

export default function App() {
  return (
    <ToastProvider>
      <TaskStoreProvider>
        <AppShell />
      </TaskStoreProvider>
    </ToastProvider>
  )
}
