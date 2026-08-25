export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold tracking-wide uppercase text-primary mb-1.5">{eyebrow}</div>
      <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">{description}</p>}
    </div>
  );
}

export default PageHeader;
