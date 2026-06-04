'use client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props { message: string; onDismiss: () => void }

export default function AlertBanner({ message, onDismiss }: Props) {
  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 flex items-center justify-between py-2">
      <AlertDescription className="flex-1">⚠ {message}</AlertDescription>
      <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0 text-destructive-foreground hover:bg-destructive/20 ml-2">×</Button>
    </Alert>
  )
}
