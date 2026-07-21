import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "HSK Learning",
  description: "Website tự học tiếng Trung cho người Việt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Script
          id="remove-extension-hydration-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function removeInjectedAttributes() {
                  document.querySelectorAll('[bis_skin_checked]').forEach(function (element) {
                    element.removeAttribute('bis_skin_checked');
                  });
                }

                removeInjectedAttributes();

                if (typeof MutationObserver !== 'undefined') {
                  var observer = new MutationObserver(removeInjectedAttributes);
                  observer.observe(document.documentElement, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked']
                  });
                  window.addEventListener('load', function () {
                    window.setTimeout(function () {
                      removeInjectedAttributes();
                      observer.disconnect();
                    }, 1000);
                  });
                }
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
