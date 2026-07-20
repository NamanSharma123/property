from django.urls import path

from . import views

urlpatterns = [
    path('ocr/extract', views.ExtractTextView.as_view()),
    path('ocr/extract-pdf', views.ExtractPDFTextView.as_view()),
    path('ocr/upload', views.UploadDocumentView.as_view()),
    path('ocr/upload-file', views.UploadFileView.as_view()),
    path('ocr/document-url', views.DocumentViewUrlView.as_view()),
    path('ocr/process', views.ProcessDocumentView.as_view()),
    path('ocr/documents', views.DocumentListView.as_view()),
    path('ocr/document/<uuid:document_id>', views.DocumentDetailView.as_view()),
    path('ocr/convert-to-transactions', views.ConvertToTransactionsView.as_view()),
    path('ocr/correct/<uuid:extracted_id>', views.CorrectExtractedDataView.as_view()),
]
