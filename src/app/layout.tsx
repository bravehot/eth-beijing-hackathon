"use client";
import { ConfigProvider, theme } from "antd";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Credit Score</title>
      </head>
      <body>
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
          <section className="w-screen h-screen overflow-hidden relative">
            {children}
          </section>
          <iframe
            className="absolute top-0 left-0"
            style={{ width: "100vw", height: "100vh" }}
            src="https://canvas.tutulist.cn/"
          />
        </ConfigProvider>
      </body>
    </html>
  );
}
