from rest_framework.views import APIView

from ..authentication import JWTAuthentication


class ProtectedView(APIView):
    """Equivalent of Express routes behind the `protect` middleware."""
    authentication_classes = [JWTAuthentication]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Force authentication to run (raises ApiError like `protect` did)
        _ = request.user


class PublicView(APIView):
    authentication_classes = []
