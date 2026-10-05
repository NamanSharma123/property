'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { documentsApi, UserDocument } from "@/lib/api";

const statusTone: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

function ViewDocumentModal({ doc, onClose }: { doc: UserDocument; onClose: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    documentsApi.getViewUrl(doc.file_url).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setPreviewUrl(res.data.url);
      else toast.error(res.error || "Could not load the document");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [doc.file_url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 truncate pr-4">{doc.file_name}</h3>
          <div className="flex items-center gap-3 flex-shrink-0">
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                Open in new tab ↗
              </a>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 overflow-hidden">
          {loading ? (
            <div className="w-full h-[70vh] flex items-center justify-center text-sm text-gray-500">Loading…</div>
          ) : previewUrl ? (
            // Browser's native PDF/image viewer — every page of a
            // multi-page PDF is reachable via its own scroll/pagination,
            // same pattern the admin OCR review dialog uses.
            <iframe src={previewUrl} title={doc.file_name} className="w-full h-[70vh]" />
          ) : (
            <div className="w-full h-[70vh] flex items-center justify-center text-sm text-gray-500">
              This document could not be previewed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<UserDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await documentsApi.getAll({ limit: 100 });
      if (cancelled) return;
      if (res.success && res.data) setDocuments(res.data.documents);
      else toast.error(res.error || "Failed to load documents");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-500">Statements and receipts received from your unique email, and anything you&apos;ve uploaded</p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Documents</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">No documents yet — statements emailed to your unique OCR address will show up here.</td></tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate">{doc.file_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.property_name || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.document_type || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusTone[doc.status] || "bg-gray-50 text-gray-500"}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => setViewing(doc)} className="text-blue-600 hover:text-blue-900">View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewing && <ViewDocumentModal doc={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
