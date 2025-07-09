import type { Metadata } from 'next';

import '@/styles/globals.css';

import Provider from './provider';

export const metadata: Metadata = {
  title: 'project-title',
  description: 'project-description',
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="ko">
    <body>
      <Provider>{children}</Provider>
    </body>
  </html>
);

export default RootLayout;
