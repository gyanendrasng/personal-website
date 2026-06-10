export const metadata = {
  title: 'Gyanendra Singh',
  description: 'Personal site of Gyanendra Singh — projects, experiments, and build logs.',
};

const S = {
  root: {
    minHeight: '100vh', background: '#FAF8F5', color: '#0f172a',
    fontFamily: '"Avenir Next","Segoe UI",system-ui,sans-serif',
  },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '72px 24px 90px' },
  name: { fontSize: 'clamp(34px,6vw,52px)', fontWeight: 800, letterSpacing: '.02em', marginBottom: 12 },
  tagline: { color: '#64748b', fontSize: 18, lineHeight: 1.7, marginBottom: 56, maxWidth: 560 },
  sectionTitle: { fontSize: 13, letterSpacing: '.3em', textTransform: 'uppercase', color: '#92400e', marginBottom: 18, fontWeight: 600 },
  card: {
    display: 'block', padding: '24px 28px', border: '1px solid #e7e2d9', borderRadius: 8,
    background: '#fff', textDecoration: 'none', boxShadow: '0 1px 3px rgba(15,23,42,.05)', marginBottom: 18,
  },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: 700, marginBottom: 6 },
  cardDesc: { color: '#64748b', fontSize: 15, lineHeight: 1.6 },
  footer: { marginTop: 70, paddingTop: 26, borderTop: '1px solid #e7e2d9', color: '#94a3b8', fontSize: 13 },
};

export default function Home() {
  return (
    <main style={S.root}>
      <div style={S.wrap}>
        <h1 style={S.name}>Gyanendra Singh</h1>
        <p style={S.tagline}>
          I build things and write about how they were built — projects, experiments, and the
          problems hit along the way.
        </p>

        <div style={S.sectionTitle}>Writing</div>
        <a href="/blogs" style={S.card}>
          <div style={S.cardTitle}>Blog →</div>
          <div style={S.cardDesc}>Build logs and notes from things I&apos;m making.</div>
        </a>

        <div style={S.footer}>© 2026 Gyanendra Singh</div>
      </div>
    </main>
  );
}
