export class ApiError extends Error {
  status: number;
  code?: string;

  constructor({ status, message, code }: { status: number; message: string; code?: string }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface Message {
  message: string;
}
