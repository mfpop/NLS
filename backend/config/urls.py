from django.contrib import admin
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView
from graphql import GraphQLError
import json

from api.schema import schema, GraphQLContext, validate_query_complexity


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
    
    def process_request(self, request):
        """Validate query complexity before processing."""
        if request.method == "POST":
            try:
                if request.content_type == "application/json":
                    body = json.loads(request.body.decode("utf-8"))
                    query_string = body.get("query", "")
                    
                    # Validate query complexity
                    is_valid, error_msg = validate_query_complexity(query_string)
                    if not is_valid:
                        return {
                            "errors": [{"message": error_msg}],
                            "data": None
                        }
            except Exception:
                # If parsing fails, let GraphQL handle it
                pass
        
        return None
    
    def get_context(self, request, response):
        return GraphQLContext(request)
    
    def get_response(self, request, response):
        """Override to add complexity validation."""
        validation_result = self.process_request(request)
        if validation_result is not None:
            return self._format_json_response(validation_result)
        
        return super().get_response(request, response)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("graphql/", csrf_exempt(ComplexityValidatingGraphQLView.as_view(schema=schema))),
]
