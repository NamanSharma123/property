import { Inbox } from "lucide-react";

export default function EmptyTab({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3">
        <Inbox className="text-gray-300" size={22} />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">{note}</p>
    </div>
  );
}
