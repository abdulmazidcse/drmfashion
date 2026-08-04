"use client"

import { SettingsFormProvider } from "./_components/SettingsFormContext"
import SettingsShell from "./_components/SettingsShell"

export default function SettingsPage() {
  return (
    <SettingsFormProvider>
      <SettingsShell />
    </SettingsFormProvider>
  )
}
