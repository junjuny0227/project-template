import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import HomePage from './HomePage';

it('HomePage가 heading을 렌더한다', () => {
  render(<HomePage />);

  expect(screen.getByRole('heading', { level: 1, name: 'Project Template' })).toBeInTheDocument();
});
