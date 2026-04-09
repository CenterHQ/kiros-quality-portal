import ProtectedLayout from "@/components/ProtectedLayout"

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>
}
