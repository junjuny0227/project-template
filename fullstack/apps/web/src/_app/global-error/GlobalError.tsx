'use client';

import { ErrorPage, type ErrorPageProps } from '@/_pages/error';

import '../styles/globals.css';

export const GlobalError = ({ error, retry }: ErrorPageProps) => (
  <html lang="ko">
    <body>
      <title>오류가 발생했습니다</title>
      <ErrorPage error={error} retry={retry} />
    </body>
  </html>
);
