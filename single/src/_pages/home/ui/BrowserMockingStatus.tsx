'use client';

import { useQuery } from '@tanstack/react-query';

import { get } from '@/shared/api';

export const BrowserMockingStatus = () => {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => get<{ status: string }>('/health'),
  });

  return <p>브라우저 요청: {data?.status}</p>;
};
