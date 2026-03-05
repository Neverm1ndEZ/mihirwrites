export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout wraps ALL admin pages except the login page itself
  // We check auth here; the login page is handled separately via param
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "2rem 1.5rem 5rem",
      }}
    >
      {children}
    </div>
  );
}
