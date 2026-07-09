import ChecklistInspeccionPage from '../../../../[area]/page';

type HvacRuiReviewRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function HvacRuiReviewRoute({ params }: HvacRuiReviewRouteProps) {
  const resolvedParams = await params;

  return ChecklistInspeccionPage({
    params: Promise.resolve({
      area: resolvedParams.id,
    }),
  });
}
