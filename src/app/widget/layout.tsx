export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-transparent">
      <body className="bg-transparent m-0 p-0 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
