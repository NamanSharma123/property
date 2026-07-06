"""
OCR documents are returned as raw rows (see apps.common.utils.model_row);
no extra serialization needed.
"""
from apps.common.utils import model_row

__all__ = ['model_row']
