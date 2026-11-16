'use client';

import Link from 'next/link';

export interface ErrorPageProps {
  error: unknown;
  retry: () => void;
}

export const ErrorPage = ({ error, retry }: ErrorPageProps) => {
  const digest =
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string'
      ? error.digest
      : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">문제가 발생했습니다</h1>
      <p>잠시 후 다시 시도하거나 홈으로 이동해 주세요.</p>
      {digest && <p className="text-sm break-all">오류 코드: {digest}</p>}
      <button className="rounded-md border px-4 py-2" type="button" onClick={retry}>
        다시 시도
      </button>
      <Link className="rounded-md border px-4 py-2 underline" href="/">
        홈으로 이동
      </Link>
    </main>
  );
};
