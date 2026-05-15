"""Tests that GraphQL mutations delegate to domain services, not write ORM directly."""

from unittest.mock import patch

from django.test import TestCase

from api.mutations.manufacturing import ManufacturingMutation
from api.types.manufacturing import ResourceGroupInput
from manufacturing.domain.structure_service import StructureService, StructureServiceError
from manufacturing.models import ResourceGroup


class Input:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __getattr__(self, name):
        return None


class GraphQLMutationDelegationTests(TestCase):
    def test_archive_resource_group_calls_structure_service(self):
        with patch.object(StructureService, "archive_resource_group") as mock:
            mock.return_value = None
            mutation = ManufacturingMutation()
            try:
                mutation.archive_resource_group("some-id")
            except AttributeError:
                pass
            mock.assert_called_once_with("some-id")

    def test_archive_resource_group_does_not_call_orm_save(self):
        with patch("manufacturing.models.ResourceGroup.save") as mock_save:
            with patch.object(StructureService, "archive_resource_group") as mock_service:
                mock_service.side_effect = StructureServiceError("id", "NOT_FOUND", "not found")
                mutation = ManufacturingMutation()
                result = mutation.archive_resource_group("nonexistent-id")
                self.assertFalse(result.ok)
                mock_save.assert_not_called()

    def test_archive_resource_group_resolver_no_orm_save(self):
        """Verify archive_resource_group uses StructureService, not direct ORM."""
        with patch("manufacturing.models.ResourceGroup.save") as mock_save:
            with patch.object(StructureService, "archive_resource_group") as mock_service:
                mock_service.side_effect = StructureServiceError("id", "NOT_FOUND", "not found")
                mutation = ManufacturingMutation()
                mutation.archive_resource_group("x")
                mock_save.assert_not_called()
