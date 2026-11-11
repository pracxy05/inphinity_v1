import AppShell from '@/components/AppShell';
import NewMissionForm from '@/components/NewMissionForm';
import { getApprovedMentor } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

export default async function NewMission({ searchParams }: { searchParams: Promise<{ mentor?: string }> }) {
  const { mentor } = await searchParams;
  const m = mentor ? await getApprovedMentor(mentor) : null;
  const minDate = new Date().toISOString().slice(0, 10);
  return (
    <AppShell role="student" title="Student workspace / New mission request">
      <NewMissionForm preferredMentor={m && !m.isSample ? m.id : undefined} preferredName={m && !m.isSample ? m.name : undefined} minDate={minDate} />
    </AppShell>
  );
}
