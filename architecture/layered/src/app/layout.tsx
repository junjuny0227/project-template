import type { Metadata } from 'next';

import { TanStackProvider } from '@/lib';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'project-title',
  description: 'project-description',
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="ko">
      <body>
        <TanStackProvider>{children}</TanStackProvider>
      </body>
    </html>
  );
};

export default RootLayout;
