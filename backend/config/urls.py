from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView
from graphql import GraphQLError
from django.http import JsonResponse
import json

from api.schema import schema, GraphQLContext, validate_query_complexity
from api.upload_import_file import upload_import_file
from api.upload_image import upload_image
from api.upload_document import upload_document
from api.upload_chat_attachment import upload_chat_attachment


class ComplexityValidatingGraphQLView(GraphQLView):
    """
    GraphQL view with complexity validation.
    
    CSRF Exemption Rationale:
    - GraphQL endpoint uses JWT tokens in Authorization header for authentication
    - CSRF tokens are not required for state-changing mutations with proper auth
    - All mutations require authenticated user context (validated via JWT)
    - Token validation in GraphQLContext.user property serves as CSRF protection
    - This is a standard pattern for JWT-authenticated GraphQL endpoints
    """

    def get_context(self, request, response):
        return GraphQLContext(request)

    def dispatch(self, request, *args, **kwargs):
        """Validate query complexity before Strawberry processes it."""
        if request.method == "POST" and request.content_type == "application/json":
            try:
                body = json.loads(request.body.decode("utf-8"))
                query_string = body.get("query", "")
                if query_string:
                    is_valid, error_msg = validate_query_complexity(query_string)
                    if not is_valid:
                        return JsonResponse(
                            {"errors": [{"message": error_msg}]},
                            status=400,
                        )
            except Exception:
                pass
        return super().dispatch(request, *args, **kwargs)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("graphql/", csrf_exempt(ComplexityValidatingGraphQLView.as_view(schema=schema))),
    path("api/import-jobs/<path:job_id>/upload/", csrf_exempt(upload_import_file)),
    path("api/upload-image/", csrf_exempt(upload_image)),
    path("api/upload-document/", csrf_exempt(upload_document)),
    path("api/upload-chat-attachment/", csrf_exempt(upload_chat_attachment)),
]

# Serve uploaded media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
