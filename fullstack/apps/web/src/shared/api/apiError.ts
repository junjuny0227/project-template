import { type AxiosError, AxiosHeaders } from 'axios';

interface ApiErrorType {
  status: number;
  code: string;
  message: string;
  requestId?: string;
}

// 모든 API 호출 실패는 이 형태로 통일된다. 원본 AxiosError는 cause에 남는다.
export class ApiError extends Error implements ApiErrorType {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor({ status, code, message, requestId }: ApiErrorType, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const readString = (source: unknown, key: string) => {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];

  return typeof value === 'string' ? value : undefined;
};

// 응답이 없는 실패(네트워크 오류, 타임아웃, 취소)는 status 0으로 둔다.
export const toApiError = (error: AxiosError): ApiError => {
  const { response } = error;
  const headers = response?.headers;
  const requestId =
    headers instanceof AxiosHeaders ? headers.get('X-Request-Id') : headers?.['x-request-id'];

  return new ApiError(
    {
      status: response?.status ?? 0,
      code: readString(response?.data, 'code') ?? error.code ?? 'UNKNOWN',
      message: readString(response?.data, 'message') ?? error.message,
      requestId: typeof requestId === 'string' ? requestId : undefined,
    },
    { cause: error },
  );
};
