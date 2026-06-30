import ChecklistInspeccionPage from '../../../page';

type RuiLifecycleRouteProps = {
  params: Promise<{
    area: string;
    status: string;
    id: string;
  }>;
};

export default async function RuiLifecycleRoute({ params }: RuiLifecycleRouteProps) {
  const resolvedParams = await params;

  return ChecklistInspeccionPage({
    params: Promise.resolve({
      area: resolvedParams.id,
    }),
  });
}
