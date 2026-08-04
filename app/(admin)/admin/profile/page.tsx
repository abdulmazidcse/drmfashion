"use client"

import { useState, useEffect } from "react"
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Save,
  Loader2,
  CheckCircle
} from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", role: "" })
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [profileMessage, setProfileMessage] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get("/admin/profile")
        setProfile({
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          role: res.data.role || ""
        })
      } catch (error) {
        console.error("Failed to load profile", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSavingProfile(true)
      setProfileMessage("")
      await api.put("/admin/profile", profile)
      setProfileMessage("Profile updated successfully")
      setTimeout(() => setProfileMessage(""), 3000)
    } catch (error) {
      console.error(error)
      Swal.fire({ text: "Failed to update profile", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError("")
    setPasswordMessage("")

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    try {
      setSavingPassword(true)
      await api.put("/admin/profile/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      })

      setPasswordMessage("Password changed securely!")
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setTimeout(() => setPasswordMessage(""), 3000)
    } catch (error: any) {
      console.error(error)
      setPasswordError(error.response?.data?.message || "Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Loading profile data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <User size={22} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Personal Profile
            </h1>
          </div>
          <p className="text-muted-foreground mt-2 text-sm max-w-md">
            Manage your personal credentials, contact information, and security settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: GENERAL INFO */}
        <Card className="h-max">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-3 text-lg">
              <User className="w-5 h-5 text-muted-foreground" />
              General Information
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="profile-name"
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="profile-email"
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="profile-phone"
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-role" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Account Role</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                  <Input
                    id="profile-role"
                    type="text"
                    disabled
                    value={profile.role}
                    className="pl-9 font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                <div>
                  {profileMessage && (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-md">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {profileMessage}
                    </span>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={savingProfile}
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* RIGHT: SECURITY */}
        <Card className="h-max">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Key className="w-5 h-5 text-muted-foreground" />
              Security &amp; Password
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  required
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="Enter current password to verify"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Choose a strong new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Repeat your new password"
                />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="flex justify-between items-center w-full gap-4">
                  <div className="flex-1">
                    {passwordError && (
                      <span className="text-xs font-medium text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-md w-fit">
                        {passwordError}
                      </span>
                    )}
                    {passwordMessage && (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-md w-fit">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {passwordMessage}
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={savingPassword}
                    className="shrink-0"
                  >
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Update Password
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
