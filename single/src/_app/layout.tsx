import type { Metadata } from 'next';

import { MockProvider, TanStackProvider } from '@/_app/providers';

import '@/_app/styles/globals.css';

export const metadata: Metadata = {
  title: 'Project Template',
  description: 'Next.js FSD application template',
};

export const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="ko">
      <body className="bg-background text-foreground antialiased">
        <MockProvider>
          <TanStackProvider>{children}</TanStackProvider>
        </MockProvider>
      </body>
    </html>
  );
};
