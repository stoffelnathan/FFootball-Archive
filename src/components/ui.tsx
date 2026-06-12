import Link from "next/link";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-zinc-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  children,
  href,
}: {
  title?: string;
  children: React.ReactNode;
  href?: string;
}) {
  const className =
    "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700";

  if (href) {
    return (
      <Link href={href} className={`${className} block`}>
        {title ? <h2 className="mb-3 text-lg font-medium">{title}</h2> : null}
        {children}
      </Link>
    );
  }

  return (
    <div className={className}>
      {title ? <h2 className="mb-3 text-lg font-medium">{title}</h2> : null}
      {children}
    </div>
  );
}

export function StatGrid({
  items,
}: {
  items: Array<{ label: string; value: string; detail?: string; href?: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const content = (
          <>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {item.value}
            </p>
            {item.detail ? (
              <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
            ) : null}
          </>
        );

        return item.href ? (
          <Link
            key={`${item.label}-${item.value}`}
            href={item.href}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-emerald-700/50"
          >
            {content}
          </Link>
        ) : (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | React.ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900 text-left text-zinc-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-zinc-800 text-zinc-200">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
