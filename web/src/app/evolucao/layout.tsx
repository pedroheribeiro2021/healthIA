import { EvolucaoSubNav } from "@/components/EvolucaoSubNav";

export default function EvolucaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center bg-neutral-50 dark:bg-neutral-950">
      <EvolucaoSubNav />
      {children}
    </div>
  );
}
