"""
Shared pagination helpers matching the Express controllers' page/limit query
params and pagination response payload.
"""
import math

from .utils import parse_int


def get_pagination(request, default_limit=10):
    page = parse_int(request.query_params.get('page'), 1)
    limit = parse_int(request.query_params.get('limit'), default_limit)
    offset = (page - 1) * limit
    return page, limit, offset


def pagination_payload(page, limit, total):
    return {
        'page': page,
        'limit': limit,
        'total': total,
        'pages': math.ceil(total / limit) if limit else 0,
    }
