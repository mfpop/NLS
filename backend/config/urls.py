from django.contrib import admin
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView

from api.schema import schema, GraphQLContext


class AuthGraphQLView(GraphQLView):
    def get_context(self, request, response):
        return GraphQLContext(request)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("graphql/", csrf_exempt(AuthGraphQLView.as_view(schema=schema))),
]
