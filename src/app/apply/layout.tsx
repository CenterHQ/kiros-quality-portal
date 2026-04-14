import Providers from '@/components/Providers'

export const metadata = {
  title: 'Assessment | Kiros Early Education',
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
