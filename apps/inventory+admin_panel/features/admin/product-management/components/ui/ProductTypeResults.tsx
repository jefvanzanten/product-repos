import type React from "react";

interface ResultItemProps {
  title: string;
  children: React.ReactNode;
}

export default function ResultItem({ title, children }: ResultItemProps) {
  return (
    <div>
      <div>
        <h2>{title}</h2>
        {children}
      </div>
      <span>Chevron</span>
    </div>
  );
}
