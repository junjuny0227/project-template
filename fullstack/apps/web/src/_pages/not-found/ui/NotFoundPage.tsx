import Link from 'next/link';

export const NotFoundPage = () => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
    <p className="text-sm">404</p>
    <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
    <p>주소를 확인하거나 홈으로 이동해 주세요.</p>
    <Link className="rounded-md border px-4 py-2 underline" href="/">
      홈으로 이동
    </Link>
  </main>
);
