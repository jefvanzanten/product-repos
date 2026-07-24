import type React from "react";
import { Link } from "react-router";

interface ResultItemProps {
  title: string;
  children?: React.ReactNode;
  to?: string;
}

export default function ResultItem({
  title,
  children,
  to,
}: ResultItemProps): React.ReactNode {
  const className =
    "flex min-h-12 w-full items-center justify-between gap-4 border-b border-[#b6b6b6] bg-white px-3 py-2 text-left text-[#151515] last:border-b-0";
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xs font-medium leading-5 text-[#151515]">{title}</h2>
        {children && (
          <div className="flex flex-wrap gap-x-1 text-[11px] leading-4 text-[#4d4d4d]">
            {children}
          </div>
        )}
      </div>
      {to && (
        <span aria-hidden="true" className="shrink-0 text-xl leading-none text-[#151515]">
          >
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
