import type { Metadata } from 'next';

import { TanStackProvider } from '@/_app/providers';

import '@/_app/styles/globals.css';

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
      <body className="bg-background text-foreground antialiased">
        <TanStackProvider>{children}</TanStackProvider>
      </body>
    </html>
  );
};

export default RootLayout;
