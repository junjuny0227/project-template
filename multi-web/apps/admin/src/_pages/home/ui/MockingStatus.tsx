import { connection } from 'next/server';

import { get } from '@/shared/api/index.server';

import BrowserMockingStatus from './BrowserMockingStatus';

// API 모킹이 서버와 브라우저 양쪽에서 동작하는지 보여 주는 확인용 표시다. 실제 화면을 만들 때 지운다.
const MockingStatus = async () => {
  // 빌드 중에는 mock server가 없다. 미리 렌더하지 않고 요청이 올 때 실행한다.
  await connection();

  const { status } = await get<{ status: string }>('/health');

  return (
    <div className="text-sm">
      <p>서버 요청: {status}</p>
      <BrowserMockingStatus />
    </div>
  );
};

export default MockingStatus;
