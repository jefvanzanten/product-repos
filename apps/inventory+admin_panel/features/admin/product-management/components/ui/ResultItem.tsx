import type React from "react";

interface ResultItemProps {
  title: string;
  children?: React.ReactNode;
}

export default function ResultItem({
  title,
  children,
}: ResultItemProps): React.ReactNode {
  return (
    <div className="bg-taupe-300 flex justify-between p-3 rounded-lg border-1 border-stone-400 items-center">
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
