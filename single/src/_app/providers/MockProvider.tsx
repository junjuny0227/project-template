'use client';

import { useEffect, useState } from 'react';

// 개발용이다. NEXT_PUBLIC_API_MOCKING이 enabled일 때만 MSW worker를 시작한다.
// 첫 요청부터 handler가 받도록 worker가 준비된 뒤에 children을 렌더한다.
const MockProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const [isReady, setIsReady] = useState(process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled');

  useEffect(() => {
    // Next는 빌드할 때 아래 두 비교를 값으로 바꾼다. 모킹을 끈 빌드와 서버용 번들에서는
    // 이 분기가 통째로 빠져서 MSW 코드가 결과물에 남지 않는다.
    // msw/browser는 서버용 번들에서 불러올 수 없어서 typeof window도 함께 본다.
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      // 브라우저 요청의 baseURL(shared/api/client.ts)과 같은 값을 넘긴다.
      void import('@/shared/api/index.mocks')
        .then(({ startWorker }) => startWorker('/backend'))
        .then(() => setIsReady(true));
    }
  }, []);

  if (!isReady) {
    return null;
  }

  return children;
};

export default MockProvider;
