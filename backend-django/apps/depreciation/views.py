"""
Depreciation schedule endpoints — upload a quantity-surveyor PDF, parse it
into per-financial-year Division 40 / Division 43 amounts (see
schedule_parser.py), and store/list/retrieve/delete the result. Standalone
data — parsed years do not create Transaction records.
"""
import io
import uuid

from django.conf import settings
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.views import ProtectedView
from apps.properties.models import Property

from . import schedule_parser
from .models import DepreciationSchedule, DepreciationScheduleYear
from .serializers import schedule_row

ALLOWED_UPLOAD_MIMES = ['application/pdf']
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB, same limit as apps.ocr


def _upload_to_s3(uploaded, owner_id):
    import boto3

    if not settings.DOCUMENTS_S3_BUCKET:
        return None, error_response('Document storage is not configured', 503)

    ext = (uploaded.name.rsplit('.', 1)[-1] if '.' in uploaded.name else 'pdf').lower()
    # Same "documents/<user>/<uuid>" key scheme as apps.ocr.UploadFileView, so
    # the existing /api/ocr/document-url presigned-URL endpoint can serve
    # this back for preview without any changes to that app.
    key = f'documents/{owner_id}/{uuid.uuid4()}.{ext}'

    try:
        s3 = boto3.client('s3', region_name=settings.DOCUMENTS_S3_REGION)
        s3.upload_fileobj(
            uploaded,
            settings.DOCUMENTS_S3_BUCKET,
            key,
            ExtraArgs={'ContentType': uploaded.content_type},
        )
    except Exception as exc:
        return None, error_response(f'Failed to store document: {exc}', 500)

    url = f'https://{settings.DOCUMENTS_S3_BUCKET}.s3.{settings.DOCUMENTS_S3_REGION}.amazonaws.com/{key}'
    return url, None


class DepreciationUploadView(ProtectedView):
    """POST /api/depreciation/upload — multipart {file, propertyId}."""

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return error_response('No file uploaded', 400)

        if uploaded.content_type not in ALLOWED_UPLOAD_MIMES:
            return error_response('Only PDF files are allowed', 400)
        if uploaded.size > MAX_FILE_SIZE:
            return error_response('File too large (max 20MB)', 400)

        property_id = request.data.get('propertyId')
        prop = Property.objects.filter(id=property_id, owner_id=request.user.id).first()
        if not prop:
            return error_response('Property not found or does not belong to you', 404)

        parse_error = None
        try:
            parsed = schedule_parser.extract_depreciation_schedule(io.BytesIO(uploaded.read()))
        except Exception as exc:
            parsed = None
            parse_error = str(exc)
        uploaded.seek(0)

        # Sanity-check the report's own stated address against the selected
        # property before storing anything — otherwise any PDF uploaded while
        # property X is selected silently gets filed under X regardless of
        # whose report it actually is. Only rejects on a confident mismatch
        # (both sides parsed to an address and they disagree); an
        # unrecognised address on either side doesn't block the upload.
        if parsed and parsed['address']:
            street = (prop.address or {}).get('street', '') if isinstance(prop.address, dict) else ''
            prop_signature = (
                schedule_parser.address_signature(street)
                or schedule_parser.address_signature(prop.full_address or '')
            )
            if prop_signature and parsed['address'][:2] != prop_signature[:2]:
                return error_response(
                    f"This report is for \"{parsed['address'][2]}\", not the selected property "
                    f"\"{prop.name}\". Select the matching property and try again.",
                    400,
                )

        url, err = _upload_to_s3(uploaded, request.user.id)
        if err:
            return err

        has_rows = bool(parsed and (parsed['diminishing_value'] or parsed['prime_cost']))

        schedule = DepreciationSchedule.objects.create(
            owner_id=request.user.id,
            property=prop,
            file_name=uploaded.name,
            file_url=url,
            file_size=uploaded.size,
            provider=parsed['provider'] if parsed else None,
            status='parsed' if has_rows else 'failed',
            error_message=None if has_rows else (
                parse_error or 'Could not find a recognised depreciation schedule table in this PDF.'
            ),
        )

        years = []
        if parsed:
            for method, rows in (
                ('diminishing_value', parsed['diminishing_value']),
                ('prime_cost', parsed['prime_cost']),
            ):
                for order, row in enumerate(rows):
                    years.append(DepreciationScheduleYear(
                        schedule=schedule,
                        method=method,
                        financial_date=row['financial_date'],
                        division_40_amount=row['division_40_amount'],
                        division_43_amount=row['division_43_amount'],
                        total_amount=row['total_amount'],
                        sort_order=order,
                    ))
        if years:
            DepreciationScheduleYear.objects.bulk_create(years)

        if has_rows:
            prop.has_depreciation = True
            prop.save()

        return Response({
            'success': True,
            'data': {'schedule': schedule_row(schedule, years)},
        }, status=201)


class DepreciationScheduleListView(ProtectedView):
    """GET /api/depreciation/schedules?propertyId=<uuid> (required)."""

    def get(self, request):
        property_id = request.query_params.get('propertyId')
        if not property_id:
            return error_response('propertyId is required', 400)

        schedules = DepreciationSchedule.objects.filter(
            owner_id=request.user.id, property_id=property_id
        ).order_by('-created_at')

        data = []
        for schedule in schedules:
            years = DepreciationScheduleYear.objects.filter(schedule=schedule)
            data.append(schedule_row(schedule, years))

        return Response({'success': True, 'data': {'schedules': data}})


class DepreciationScheduleDetailView(ProtectedView):
    def get(self, request, schedule_id):
        schedule = DepreciationSchedule.objects.filter(id=schedule_id, owner_id=request.user.id).first()
        if not schedule:
            return error_response('Depreciation schedule not found', 404)
        years = DepreciationScheduleYear.objects.filter(schedule=schedule)
        return Response({'success': True, 'data': {'schedule': schedule_row(schedule, years)}})

    def delete(self, request, schedule_id):
        deleted, _ = DepreciationSchedule.objects.filter(id=schedule_id, owner_id=request.user.id).delete()
        if not deleted:
            return error_response('Depreciation schedule not found', 404)
        return Response({'success': True, 'message': 'Depreciation schedule deleted successfully'})
