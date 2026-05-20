import json
import os
from dataclasses import dataclass
from typing import Any
from django.db import transaction
from django.db.models import Count, Q
from manufacturing.models.lineage import (
    ErpSourceDefinition, ErpDefinitionField, ErpRelationshipDefinition,
    ErpImportBatch, ErpStagingRow, ErpValidationResult, ErpImportLog,
    ErpScope, ValidationSeverity,
)


@dataclass
class LineageServiceError(Exception):
    field: str | None
    code: str
    message: str


class LineageService:

    # ── Source Definitions ─────────────────────────────────────────────

    @staticmethod
    def list_definitions(scope: str | None = None, active: bool | None = None):
        qs = ErpSourceDefinition.objects.annotate(
            _field_count=Count("fields", filter=Q(fields__active=True))
        )
        if scope:
            qs = qs.filter(scope=scope)
        if active is not None:
            qs = qs.filter(active=active)
        return qs.order_by("scope", "name")

    @staticmethod
    def get_definition(definition_id: str) -> ErpSourceDefinition:
        try:
            return ErpSourceDefinition.objects.annotate(
                _field_count=Count("fields", filter=Q(fields__active=True))
            ).get(id=definition_id)
        except ErpSourceDefinition.DoesNotExist as e:
            raise LineageServiceError("id", "NOT_FOUND", "Source definition not found") from e

    @staticmethod
    @transaction.atomic
    def create_definition(input_data: dict) -> ErpSourceDefinition:
        if not input_data.get("name", "").strip():
            raise LineageServiceError("name", "REQUIRED", "Name is required")
        if not input_data.get("scope"):
            raise LineageServiceError("scope", "REQUIRED", "Scope is required")
        definition = ErpSourceDefinition.objects.create(
            name=input_data["name"].strip(),
            scope=input_data["scope"],
            source_type=input_data.get("source_type", "MANUAL"),
            destination_table=input_data.get("destination_table", ""),
            expected_file_pattern=input_data.get("expected_file_pattern", ""),
            active=input_data.get("active", True),
            status=input_data.get("status", "DRAFT"),
            schema_json=input_data.get("schema_json", {}),
            row_count=input_data.get("row_count", 0),
        )
        return LineageService.get_definition(str(definition.id))

    @staticmethod
    @transaction.atomic
    def update_definition(definition_id: str, input_data: dict) -> ErpSourceDefinition:
        definition = LineageService.get_definition(definition_id)
        for field in ("name", "scope", "source_type", "destination_table",
                       "expected_file_pattern", "active", "status", "schema_json", "row_count"):
            if field in input_data and input_data[field] is not None:
                setattr(definition, field, input_data[field])
        definition.save()
        return LineageService.get_definition(definition_id)

    @staticmethod
    @transaction.atomic
    def delete_definition(definition_id: str) -> None:
        definition = LineageService.get_definition(definition_id)
        ErpStagingRow.objects.filter(source_definition=definition).delete()
        ErpValidationResult.objects.filter(source_definition=definition).delete()
        ErpImportBatch.objects.filter(source_definition=definition).delete()
        definition.fields.all().delete()
        definition.relationships.all().delete()
        definition.delete()

    # ── Definition Fields ──────────────────────────────────────────────

    @staticmethod
    def list_fields(definition_id: str):
        ErpSourceDefinition.objects.get(id=definition_id)
        return ErpDefinitionField.objects.filter(source_definition_id=definition_id, active=True)

    @staticmethod
    @transaction.atomic
    def save_field(definition_id: str, input_data: dict) -> ErpDefinitionField:
        ErpSourceDefinition.objects.get(id=definition_id)
        field, _ = ErpDefinitionField.objects.update_or_create(
            source_definition_id=definition_id,
            field_name=input_data["field_name"],
            defaults={
                "data_type": input_data.get("data_type", "string"),
                "required": input_data.get("required", False),
                "primary_key": input_data.get("primary_key", False),
                "foreign_key": input_data.get("foreign_key", False),
                "nexus_field": input_data.get("nexus_field", ""),
                "aliases_json": input_data.get("aliases_json", []),
                "active": input_data.get("active", True),
            },
        )
        return field

    @staticmethod
    @transaction.atomic
    def delete_field(field_id: str) -> None:
        field = ErpDefinitionField.objects.get(id=field_id)
        field.delete()

    # ── Relationships ──────────────────────────────────────────────────

    @staticmethod
    def list_relationships(definition_id: str):
        return ErpRelationshipDefinition.objects.filter(
            source_definition_id=definition_id, active=True
        ).select_related("target_source_definition")

    @staticmethod
    @transaction.atomic
    def save_relationship(definition_id: str, input_data: dict) -> ErpRelationshipDefinition:
        rel, _ = ErpRelationshipDefinition.objects.update_or_create(
            source_definition_id=definition_id,
            source_field=input_data["source_field"],
            target_source_definition_id=input_data["target_source_definition_id"],
            target_field=input_data["target_field"],
            defaults={
                "relationship_type": input_data["relationship_type"],
                "required": input_data.get("required", False),
                "active": input_data.get("active", True),
            },
        )
        return rel

    @staticmethod
    @transaction.atomic
    def delete_relationship(relationship_id: str) -> None:
        rel = ErpRelationshipDefinition.objects.get(id=relationship_id)
        rel.delete()

    # ── Staging / Related Data ─────────────────────────────────────────

    @staticmethod
    def get_latest_batch(definition_id: str) -> ErpImportBatch | None:
        return ErpImportBatch.objects.filter(
            source_definition_id=definition_id
        ).order_by("-imported_at").first()

    @staticmethod
    def list_staging_rows(definition_id: str, batch_id: str | None = None, offset: int = 0, limit: int = 100):
        qs = ErpStagingRow.objects.filter(source_definition_id=definition_id)
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs.order_by("row_number")

    @staticmethod
    def get_field_profile(definition_id: str, field_name: str) -> dict:
        rows = ErpStagingRow.objects.filter(source_definition_id=definition_id)
        values = []
        for row in rows:
            val = row.raw_data_json.get(field_name)
            if val is not None:
                values.append(val)
        distinct = set(values)
        null_count = rows.filter(
            **{f"raw_data_json__{field_name}__isnull": True}
        ).count() if values else rows.count()
        return {
            "field_name": field_name,
            "distinct_values": len(distinct),
            "null_count": null_count,
            "duplicate_count": len(values) - len(distinct) if values else 0,
            "sample_values": list(distinct)[:10],
            "nexus_field": "",
            "invalid_values": [],
        }

    # ── Validation ─────────────────────────────────────────────────────

    @staticmethod
    def run_validation(definition_id: str, destination_table: str) -> dict:
        ErpValidationResult.objects.filter(source_definition_id=definition_id).delete()
        definition = LineageService.get_definition(definition_id)
        fields = LineageService.list_fields(definition_id)
        results: list[dict] = []

        # Check required columns exist
        for field in fields:
            if field.required and field.primary_key:
                results.append({
                    "severity": ValidationSeverity.INFO,
                    "entity": definition.name,
                    "field_name": field.field_name,
                    "row_number": None,
                    "rule_code": "PK_EXISTS",
                    "message": f"Primary key '{field.field_name}' is defined.",
                    "recommended_action": "",
                })

        # Check destination table selected
        if not destination_table:
            results.append({
                "severity": ValidationSeverity.ERROR,
                "entity": definition.name,
                "field_name": "",
                "row_number": None,
                "rule_code": "DEST_MISSING",
                "message": "No destination table selected for this definition.",
                "recommended_action": "Select a destination table in the toolbar.",
            })

        # Check required Nexus mappings
        for field in fields:
            if field.required and not field.nexus_field:
                results.append({
                    "severity": ValidationSeverity.ERROR,
                    "entity": definition.name,
                    "field_name": field.field_name,
                    "row_number": None,
                    "rule_code": "REQUIRED_MAPPING_MISSING",
                    "message": f"Required field '{field.field_name}' has no Nexus field mapping.",
                    "recommended_action": "Map this field to a Nexus destination field.",
                })

        # Check staging data exists
        latest = LineageService.get_latest_batch(definition_id)
        if not latest:
            results.append({
                "severity": ValidationSeverity.WARNING,
                "entity": definition.name,
                "field_name": "",
                "row_number": None,
                "rule_code": "NO_STAGING_DATA",
                "message": "No imported staging data available for this definition.",
                "recommended_action": "Import a file to populate staging rows.",
            })

        # Check relationships
        rels = LineageService.list_relationships(definition_id)
        for rel in rels:
            try:
                LineageService.get_definition(str(rel.target_source_definition_id))
            except LineageServiceError:
                results.append({
                    "severity": ValidationSeverity.ERROR,
                    "entity": rel.source_field,
                    "field_name": rel.target_field,
                    "row_number": None,
                    "rule_code": "RELATIONSHIP_TARGET_MISSING",
                    "message": f"Relationship target definition (ID {rel.target_source_definition_id}) not found.",
                    "recommended_action": "Reassign or remove this relationship.",
                })

        # Persist validation results
        created = []
        for r in results:
            vr = ErpValidationResult.objects.create(
                scope=definition.scope,
                source_definition=definition,
                destination_table=destination_table,
                severity=r["severity"],
                entity=r["entity"],
                field_name=r["field_name"],
                row_number=r["row_number"],
                rule_code=r["rule_code"],
                message=r["message"],
                recommended_action=r["recommended_action"],
            )
            created.append(vr)

        errors = sum(1 for r in created if r.severity == ValidationSeverity.ERROR)
        warnings = sum(1 for r in created if r.severity == ValidationSeverity.WARNING)
        info = sum(1 for r in created if r.severity == ValidationSeverity.INFO)

        return {
            "results": created,
            "total_errors": errors,
            "total_warnings": warnings,
            "total_info": info,
        }

    @staticmethod
    def list_validation_results(definition_id: str, severity: str | None = None):
        qs = ErpValidationResult.objects.filter(source_definition_id=definition_id)
        if severity:
            qs = qs.filter(severity=severity)
        return qs.order_by("-created_at")

    # ── Scope / Enum data ──────────────────────────────────────────────

    @staticmethod
    def get_scopes() -> list[dict]:
        return [
            {"value": s.value, "label": s.label}
            for s in ErpScope
        ]

    @staticmethod
    def get_destination_tables(scope: str | None = None) -> list[str]:
        base = {
            "PLANT_STRUCTURE": ["Company", "Plant", "Warehouse", "ProductionLine",
                                "Department", "ResourceGroup", "Resource",
                                "MaterialBin", "RoutingStep"],
            "PRODUCT_MASTER": ["ProductFamily", "ProductModel", "ProductVariant", "PartNumber"],
            "MATERIALS": ["Material", "BOM", "BOMItem"],
            "WAREHOUSE_BINS": ["Warehouse", "MaterialBin", "InventoryLocation"],
            "ROUTING": ["Routing", "RoutingStep", "ProcessFlow", "ProcessStep"],
            "SCHEDULES": ["Schedule", "Shift", "ScheduleAssignment"],
            "CAPACITY": ["CapacityPlan", "CapacityProfile", "CapacitySnapshot"],
            "QUALITY": ["QualityCheck", "DefectRecord"],
            "CUSTOM": [],
        }
        if scope:
            return base.get(scope, [])
        return list(base.values())

    # ── Filesystem-based source definitions ────────────────────────────

    @staticmethod
    def _read_json_definitions(directory: str) -> list[dict]:
        """Read all JSON definition files from a given directory under the project root."""
        base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), directory)
        definitions = []
        if not os.path.isdir(base_dir):
            return definitions
        for fname in sorted(os.listdir(base_dir)):
            if not fname.endswith(".json"):
                continue
            fpath = os.path.join(base_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                data["_filePath"] = fpath
                data["_fileName"] = fname
                definitions.append(data)
            except (json.JSONDecodeError, OSError):
                continue
        return definitions

    @staticmethod
    def get_structure_definitions() -> list[dict]:
        """Read ERP source definition JSON files from erp_data/structure/."""
        return LineageService._read_json_definitions("erp_data/structure")

    @staticmethod
    def get_pattern_definitions() -> list[dict]:
        """Read ERP source definition JSON files from erp_data/patterns/ only."""
        return LineageService._read_json_definitions("erp_data/patterns")

    @staticmethod
    def get_structure_definition(name: str) -> dict | None:
        """Read a single structure definition by name, matching name field or filename."""
        for d in LineageService.get_structure_definitions():
            if d.get("name") == name or d.get("_fileName", "").replace(".json", "") == name:
                return d
        return None
