import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton kpis={3} chart={false} rows={6} />;
}
