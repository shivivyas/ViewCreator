import { TemplateViewPage } from "@/components/templates/template-view-page";

/**
 * Template detail page — full-page view for a single template.
 *
 * Route: /templates/[id]
 * Shows: 4 stacked reference images + AI-generated prompt (left 55%)
 *        Generate controls: count, aspect ratio, generate button (right 45%)
 *        Sticky header with back nav + footer
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TemplateViewPage templateId={id} />;
}
