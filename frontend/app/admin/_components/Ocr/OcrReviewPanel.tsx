"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/app/admin/_components/PageHeader";
import ReviewQueueTab from "./ReviewQueueTab";
import TemplatesTab from "./TemplatesTab";
import EmailInboxTab from "./EmailInboxTab";

export default function OcrReviewPanel({ isFullAdmin }: { isFullAdmin: boolean }) {
  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="OCR Review Panel"
        description="Documents OCR couldn't confidently process land in Pending Review. Approve to create a transaction, or reject."
      />

      <Tabs defaultValue="pending">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="processed">Processed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="email-inbox">Email Inbox</TabsTrigger>
        </TabsList>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <TabsContent value="pending" className="mt-0"><ReviewQueueTab status="pending" /></TabsContent>
          <TabsContent value="processed" className="mt-0"><ReviewQueueTab status="completed" /></TabsContent>
          <TabsContent value="failed" className="mt-0"><ReviewQueueTab status="failed" /></TabsContent>
          <TabsContent value="templates" className="mt-0"><TemplatesTab isFullAdmin={isFullAdmin} /></TabsContent>
          <TabsContent value="email-inbox" className="mt-0"><EmailInboxTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
