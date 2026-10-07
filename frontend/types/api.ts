export interface ApiErrorPayload {
  status: number;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor({ status, message, code }: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface SendOtpResponse {
  success: boolean;
  provider?: string;
  status?: string;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

export interface AdminStats {
  users: { total: number; patients: number; doctors: number };
  facilities: { pharmacies: number; medicines: number };
  clinical: {
    appointments: number;
    triage_cases: number;
    ai_analyses: number;
    medical_reports: number;
  };
}
