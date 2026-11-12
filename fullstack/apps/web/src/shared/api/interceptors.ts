import { type AxiosInstance, isAxiosError } from 'axios';

import { type ApiError, toApiError } from './apiError';

type UnauthorizedHandlerType = (error: ApiError) => void | Promise<void>;

let onUnauthorized: UnauthorizedHandlerType = () => {};
let pendingUnauthorized: Promise<void> | null = null;

// 인증을 붙일 때 토큰 갱신이나 로그인 이동을 여기에 꽂는다. 기본값은 아무것도 하지 않는다.
// - 훅 안에서 보내는 요청은 이 인터셉터가 없는 인스턴스로 보낸다. 같은 인스턴스로 보내서 401을 받으면
//   그 요청이 훅이 끝나기를 기다리게 되어 서로 멈춘다.
// - 훅이 에러를 던지면 요청은 ApiError가 아니라 그 에러로 실패한다.
export const setOnUnauthorized = (handler: UnauthorizedHandlerType) => {
  onUnauthorized = handler;
};

// 훅이 끝나기 전에 들어온 401은 진행 중인 호출을 함께 기다린다. 훅은 한 번만 실행된다.
const notifyUnauthorized = (error: ApiError) => {
  pendingUnauthorized ??= (async () => {
    await onUnauthorized(error);
  })().finally(() => {
    pendingUnauthorized = null;
  });

  return pendingUnauthorized;
};

export const applyInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error)) {
      throw error;
    }

    const apiError = toApiError(error);

    if (apiError.status === 401) {
      await notifyUnauthorized(apiError);
    }

    throw apiError;
  });

  return instance;
};
