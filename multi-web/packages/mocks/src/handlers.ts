import { http, HttpResponse } from 'msw';

// 같은 요청이라도 나가는 주소는 실행 위치마다 다르다.
// 브라우저는 `/backend/health`로, 서버는 `${API_BASE_URL}/health`로 보낸다.
// 그래서 주소 앞부분을 baseUrl로 받고, 앱이 자기 실행 위치의 값을 넘긴다.
export const createHandlers = (baseUrl: string) => {
  // axios는 baseURL 끝의 `/`를 떼고 경로를 붙인다. handler 주소도 같게 맞춘다.
  const base = baseUrl.replace(/\/+$/, '');

  return [
    // 모킹 설정이 동작하는지 확인하는 예시다. 실제 API를 붙일 때 그 경로의 handler로 바꾼다.
    http.get(`${base}/health`, () => HttpResponse.json({ status: 'mocked' })),
  ];
};
