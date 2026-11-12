import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import HomePage from './HomePage';

// 모킹 확인용 표시는 서버 전용 모듈을 불러온다. 단위 테스트에서는 빈 컴포넌트로 바꾼다.
vi.mock('./MockingStatus', () => ({ default: () => null }));

it('HomePage가 heading을 렌더한다', () => {
  render(<HomePage />);

  expect(screen.getByRole('heading', { level: 1, name: 'Project Template' })).toBeInTheDocument();
});
