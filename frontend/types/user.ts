export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  location: string | null;
  abha_id: string | null;
  pmjay_eligible: boolean;
  role: UserRole;
  phone_verified: boolean;
  email_verified?: boolean;
  profile_completed: boolean;
}

export interface PatientProfile extends AuthUser {
  blood_group: string | null;
  address: string | null;
  emergency_contact: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  medical_history: string | null;
}

export interface PatientProfileUpdate {
  name?: string;
  age?: number;
  gender?: string;
  location?: string;
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
  allergies?: string;
  chronic_conditions?: string;
  medical_history?: string;
  abha_id?: string;
  pmjay_eligible?: boolean;
}

export interface AuthTokens {
  token: string;
  refresh_token: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
  message: string;
}

export interface SignupPayload {
  phone: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  location: string;
  password: string;
  email?: string;
  abha_id?: string;
  pmjay_eligible?: boolean;
  otp_code?: string;
}
