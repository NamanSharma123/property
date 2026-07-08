import os

from django.apps import AppConfig


class OcrConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ocr'

    def ready(self):
        # Point pytesseract at the bundled portable Tesseract binary for local
        # Windows dev (see backend-django/tesseract_bin, gitignored — copy it
        # in yourself if you don't have a system Tesseract install). Falls
        # back to whatever's on PATH otherwise (system install / Docker apt
        # package in prod).
        bundled_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'tesseract_bin')
        bundled_exe = os.path.join(bundled_dir, 'tesseract.exe')
        if os.path.isfile(bundled_exe):
            import pytesseract

            pytesseract.pytesseract.tesseract_cmd = os.path.abspath(bundled_exe)
            os.environ['TESSDATA_PREFIX'] = os.path.abspath(os.path.join(bundled_dir, 'tessdata'))
