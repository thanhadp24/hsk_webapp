import Link from "next/link";
import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-24 md:px-6 lg:px-8 lg:pb-8">{children}</main>;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <header className="mb-6 space-y-4">
      {breadcrumbs?.length ? (
        <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {breadcrumbs.map((item, index) => (
            <span className="flex items-center gap-2" key={`${item.label}-${index}`}>
              {item.href ? <Link className="hover:text-primary" href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
              {index < breadcrumbs.length - 1 ? <span>/</span> : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}
