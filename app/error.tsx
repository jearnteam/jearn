// app/error.tsx
'use client';
export default function Error({ error }: { error: Error }) {
  return (
    <p style={{ color: 'red', padding: '2rem' }}>
      ❌ Something went wrong: {error.message}
    </p>
  );
}
