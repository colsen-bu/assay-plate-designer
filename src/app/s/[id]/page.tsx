import { redirect } from 'next/navigation';
import { getNotationByShortId } from '@/lib/short-links';

export const dynamic = 'force-dynamic';

interface ShortLinkPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { id } = await params;
  const notation = await getNotationByShortId(id);

  if (!notation) {
    redirect('/');
  }

  redirect(`/#pn=${encodeURIComponent(notation)}`);
}
