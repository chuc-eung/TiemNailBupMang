import "./globals.css";

export const metadata = {
  title: "Nail Studio | Nail & Beauty Spa",
  description: "Nail, head spa và massage thư giãn.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
