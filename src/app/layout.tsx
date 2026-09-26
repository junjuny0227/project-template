import type { Metadata } from 'next';

import './globals.css';
import TanStackProvider from './providers';

export const metadata: Metadata = {
  title: 'Project Template',
  description: 'Next.js FSD application template',
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
