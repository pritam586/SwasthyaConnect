export type UserProfile = {
  id: string
  phone: string
  name: string
  age: number | string
  gender: string
  location: string
  abha_id?: string | null
  pmjay_eligible?: boolean
  role: "patient" | "doctor"
}

export type AuthResult = {
  token: string
  user: UserProfile
  message: string
}

export async function checkUserExists(phone: string): Promise<{ exists: boolean; name?: string; role?: string }> {
  const res = await fetch("/api/v1/auth/check-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  })
  if (!res.ok) throw new Error("Failed to check user status.")
  return res.json()
}

export async function requestPhoneOtp(phone: string): Promise<{ success: boolean; otp_code?: string; message: string }> {
  const res = await fetch("/api/v1/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  })
  if (!res.ok) throw new Error("Failed to send OTP.")
  return res.json()
}

export async function registerUser(data: {
  phone: string
  name: string
  age: number
  gender: string
  location: string
  password: string
  abha_id?: string
  pmjay_eligible?: boolean
}): Promise<AuthResult> {
  const res = await fetch("/api/v1/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.detail || "Registration failed.")
  return payload
}

export async function loginUser(phone: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.detail || "Login failed.")
  return payload
}

export async function loginDoctor(phone_or_email: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/v1/auth/doctor-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_or_email, password }),
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.detail || "Doctor login failed.")
  return payload
}
