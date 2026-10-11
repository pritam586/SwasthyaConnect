export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";
export type Gender = "Male" | "Female" | "Other";
export type DoctorVerification = "PENDING" | "VERIFIED" | "REJECTED";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  age: number | null;
  gender: string | null;
  location: string | null;
  abha_id: string | null;
  phone_verified: boolean;
  doctor_verification_status: DoctorVerification | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface PatientSignup {
  phone: string;
  name: string;
  password: string;
  age: number;
  gender: Gender;
  location: string;
  email?: string;
}

export interface DoctorSignup {
  phone: string;
  name: string;
  password: string;
  email: string;
  specialization: string;
  qualification: string;
  license_number: string;
  experience_years: number;
  clinic_name?: string;
  location: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  location: string | null;
  abha_id: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  address: string | null;
  emergency_contact: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  medical_history: string | null;
}

export type ProfileUpdate = Partial<Omit<PatientProfile, "id" | "phone" | "email" | "abha_id">>;
