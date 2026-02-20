import { AlertCircle } from "lucide-react";

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="card flex items-start gap-3 border-red-900 bg-red-950/50">
      <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-red-300">Error</p>
        <p className="text-xs text-red-400 mt-1">{message}</p>
      </div>
    </div>
  );
}
