from unittest.mock import patch

from django.test import TestCase

from api.mutations.manufacturing import ManufacturingMutation
from api.types.manufacturing import MaterialBinInput
from manufacturing.domain.material_bin_service import MaterialBinService, MaterialBinServiceError


class MaterialBinGraphQLDelegationTests(TestCase):
    """Verify that GraphQL resolvers delegate to MaterialBinService
    and return structured error payloads (never 500) for service exceptions."""

    def _make_input(self, **overrides) -> MaterialBinInput:
        kwargs = dict(
            plant_id="plant-1",
            resource_group_id="rg-1",
            code="BIN-1",
            name="Bin 1",
            bin_type="INPUT",
        )
        kwargs.update(overrides)
        return MaterialBinInput(**kwargs)

    # ── Delegation tests ──

    def test_create_material_bin_delegates_to_service(self):
        input_obj = self._make_input()
        with patch.object(MaterialBinService, "create_bin") as create_bin:
            create_bin.side_effect = MaterialBinServiceError("plantId", "NOT_FOUND", "missing")
            result = ManufacturingMutation().create_material_bin(input_obj)
        self.assertFalse(result.ok)
        create_bin.assert_called_once()

    def test_update_material_bin_delegates_to_service(self):
        input_obj = self._make_input()
        with patch.object(MaterialBinService, "update_bin") as update_bin:
            update_bin.side_effect = MaterialBinServiceError("id", "NOT_FOUND", "missing")
            result = ManufacturingMutation().update_material_bin("bin-1", input_obj)
        self.assertFalse(result.ok)
        update_bin.assert_called_once()

    def test_archive_material_bin_delegates_to_service(self):
        with patch.object(MaterialBinService, "archive_bin") as archive_bin:
            archive_bin.side_effect = MaterialBinServiceError("id", "NOT_FOUND", "missing")
            result = ManufacturingMutation().archive_material_bin("bin-1")
        self.assertFalse(result.ok)
        archive_bin.assert_called_once()

    # ── Structured error payload tests ──

    def test_graphql_duplicate_material_bin_returns_structured_error(self):
        """Simulate a DUPLICATE_PLANT_CODE service error and verify the
        GraphQL payload includes ok=false, errorCode, message, and field."""
        input_obj = self._make_input(code="DUP-1")
        with patch.object(MaterialBinService, "create_bin") as create_bin:
            create_bin.side_effect = MaterialBinServiceError(
                "code", "DUPLICATE_PLANT_CODE",
                "A material bin with this code already exists in the same plant.",
            )
            result = ManufacturingMutation().create_material_bin(input_obj)
        self.assertFalse(result.ok)
        self.assertIsNone(result.material_bin)
        # Check the errors list
        self.assertEqual(len(result.errors), 1)
        error = result.errors[0]
        self.assertEqual(error.code, "DUPLICATE_PLANT_CODE")
        self.assertEqual(error.field, "code")
        self.assertIn("already exists", error.message)

    def test_graphql_archive_blocked_bin_returns_structured_error(self):
        """Simulate a BIN_IN_ACTIVE_FLOW service error and verify the
        payload includes details with references."""
        with patch.object(MaterialBinService, "archive_bin") as archive_bin:
            archive_bin.side_effect = MaterialBinServiceError(
                "binId", "BIN_IN_ACTIVE_FLOW",
                "Cannot archive bin that is referenced by active routing steps.",
                details={"references": [{"type": "material_movement_rule", "id": "1", "routing_id": "2"}]},
            )
            result = ManufacturingMutation().archive_material_bin("bin-1")
        self.assertFalse(result.ok)
        self.assertEqual(len(result.errors), 1)
        error = result.errors[0]
        self.assertEqual(error.code, "BIN_IN_ACTIVE_FLOW")
        self.assertIn("references", (error.details or ""))

    def test_graphql_material_bin_mutation_does_not_return_500(self):
        """Verify that a MaterialBinServiceError is caught and returned
        as a structured payload rather than propagating as an unhandled exception."""
        input_obj = self._make_input()
        with patch.object(MaterialBinService, "create_bin") as create_bin:
            create_bin.side_effect = MaterialBinServiceError(
                "plantId", "NOT_FOUND", "Plant not found",
            )
            # This should NOT raise — it should return a payload with ok=False
            result = ManufacturingMutation().create_material_bin(input_obj)
        self.assertFalse(result.ok)
        self.assertIsInstance(result.errors, list)
        self.assertEqual(len(result.errors), 1)

    def test_graphql_update_mutation_does_not_return_500(self):
        """Same as above but for update mutation."""
        input_obj = self._make_input()
        with patch.object(MaterialBinService, "update_bin") as update_bin:
            update_bin.side_effect = MaterialBinServiceError(
                "id", "NOT_FOUND", "Material bin not found",
            )
            result = ManufacturingMutation().update_material_bin("bin-1", input_obj)
        self.assertFalse(result.ok)
        self.assertIsInstance(result.errors, list)

    def test_graphql_archive_mutation_does_not_return_500(self):
        """Same as above but for archive mutation."""
        with patch.object(MaterialBinService, "archive_bin") as archive_bin:
            archive_bin.side_effect = MaterialBinServiceError(
                "id", "NOT_FOUND", "Material bin not found",
            )
            result = ManufacturingMutation().archive_material_bin("bin-1")
        self.assertFalse(result.ok)
        self.assertIsInstance(result.errors, list)

    def test_graphql_generic_exception_returns_structured_error(self):
        """If the service raises an unexpected non-MaterialBinServiceError,
        the mutation should also return a structured error (not crash)."""
        input_obj = self._make_input()
        with patch.object(MaterialBinService, "create_bin") as create_bin:
            create_bin.side_effect = RuntimeError("Unexpected internal error")
            result = ManufacturingMutation().create_material_bin(input_obj)
        self.assertFalse(result.ok)
        self.assertEqual(len(result.errors), 1)
        # The generic handler uses field="_form" and code="ERROR"
        self.assertEqual(result.errors[0].code, "ERROR")
        self.assertEqual(result.errors[0].field, "_form")
