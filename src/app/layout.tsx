import './globals.css';

export const metadata = {
  title: 'PharmaOps 360',
  description: 'Piloto HVAC para gestion operativa regulada',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
