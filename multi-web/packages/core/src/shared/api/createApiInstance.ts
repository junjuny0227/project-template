import axios from 'axios';

import { applyInterceptors } from './interceptors';

// 앱이 검증한 baseURL을 전달한다. 공용 패키지는 환경 변수를 읽지 않는다.
export const createApiInstance = (baseURL: string) =>
  applyInterceptors(axios.create({ baseURL, timeout: 10000 }));
