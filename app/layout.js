export const metadata = {
  title: {
    default: 'Gyanendra Singh',
    template: '%s — Gyanendra Singh',
  },
  description: 'Personal site of Gyanendra Singh — projects, experiments, and build logs.',
};

export const viewport = {
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
