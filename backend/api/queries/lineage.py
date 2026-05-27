import strawberry
from typing import Optional
from api.types.lineage import (
    ErpSourceDefinitionNode, ErpStructureFileNode, ErpDefinitionFieldNode, ErpRelationshipDefinitionNode,
    ErpImportBatchNode, ErpStagingRowNode, ErpValidationResultNode, ErpImportLogNode,
    ErpSourceDefinitionsResult, ErpDefinitionFieldsResult, ErpRelationshipDefinitionsResult,
    ErpStagingRowsResult, ErpValidationResultsResult, ErpImportBatchesResult,
    ErpLineageValidationSummary, ErpFieldProfile,
    ErpGraphTableNode, ErpGraphFieldNode, ErpGraphRelationshipNode, ErpRelationshipGraphResult,
    ErpRelationshipValidationNode,
)
from api.types.pagination import PageInfo, paginate_queryset
from manufacturing.domain.lineage_service import LineageService, LineageServiceError


@strawberry.type
class LineageQuery:

    @strawberry.field
    def erp_scopes(self) -> list[str]:
        return [s.value for s in LineageService.get_scopes()]

    @strawberry.field
    def erp_destination_tables(self, scope: Optional[str] = None) -> list[str]:
        return LineageService.get_destination_tables(scope)

    @strawberry.field
    def erp_source_definitions(
        self, scope: Optional[str] = None,
        is_active: Optional[bool] = None,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ErpSourceDefinitionsResult:
        qs = LineageService.list_definitions(scope=scope, active=is_active)
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ErpSourceDefinitionsResult(
            items=[ErpSourceDefinitionNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def erp_source_definition(self, id: str) -> Optional[ErpSourceDefinitionNode]:
        try:
            obj = LineageService.get_definition(id)
            return ErpSourceDefinitionNode.from_db(obj)
        except LineageServiceError:
            return None

    @strawberry.field
    def erp_structure_definitions(self) -> list[ErpStructureFileNode]:
        """List source definitions from erp_data/structure/*.json files."""
        defs = LineageService.get_structure_definitions()
        return [
            ErpStructureFileNode(
                name=d.get("name", "Unknown"),
                scope=d.get("scope", "CUSTOM"),
                source_type=d.get("sourceType", "MANUAL"),
                destination_table=d.get("destinationTable", ""),
                expected_file_pattern=d.get("expectedFilePattern", ""),
                active=d.get("active", True),
                status=d.get("status", "DRAFT"),
                fields=d.get("fields", []),
                relationships=d.get("relationships", []),
                file_name=d.get("_fileName", ""),
            )
            for d in defs
        ]

    @strawberry.field
    def erp_pattern_definitions(self) -> list[ErpStructureFileNode]:
        """List source definitions from erp_data/patterns/*.json files (used by toolbar selector)."""
        defs = LineageService.get_pattern_definitions()
        return [
            ErpStructureFileNode(
                name=d.get("name", "Unknown"),
                scope=d.get("scope", "CUSTOM"),
                source_type=d.get("sourceType", "MANUAL"),
                destination_table=d.get("destinationTable", ""),
                expected_file_pattern=d.get("expectedFilePattern", ""),
                active=d.get("active", True),
                status=d.get("status", "DRAFT"),
                fields=d.get("fields", []),
                relationships=d.get("relationships", []),
                file_name=d.get("_fileName", ""),
            )
            for d in defs
        ]

    @strawberry.field
    def erp_destination_definitions(self) -> list[ErpStructureFileNode]:
        """List destination definitions from erp_data/destinations/*.json."""
        defs = LineageService.get_destination_definitions()
        return [
            ErpStructureFileNode(
                name=d.get("name", "Unknown"),
                scope=d.get("scope", "CUSTOM"),
                source_type=d.get("sourceType", "MANUAL"),
                destination_table=d.get("destinationTable", ""),
                expected_file_pattern=d.get("expectedFilePattern", ""),
                active=d.get("active", True),
                status=d.get("status", "DRAFT"),
                fields=d.get("fields", []),
                relationships=d.get("relationships", []),
                file_name=d.get("_fileName", ""),
            )
            for d in defs
        ]

    @strawberry.field
    def erp_destination_definition(self, name: str) -> Optional[ErpStructureFileNode]:
        """Get a single destination definition from erp_data/destinations/."""
        d = LineageService.get_destination_definition(name)
        if not d:
            return None
        return ErpStructureFileNode(
            name=d.get("name", "Unknown"),
            scope=d.get("scope", "CUSTOM"),
            source_type=d.get("sourceType", "MANUAL"),
            destination_table=d.get("destinationTable", ""),
            expected_file_pattern=d.get("expectedFilePattern", ""),
            active=d.get("active", True),
            status=d.get("status", "DRAFT"),
            fields=d.get("fields", []),
            relationships=d.get("relationships", []),
            file_name=d.get("_fileName", ""),
        )

    @strawberry.field
    def erp_structure_definition(self, name: str) -> Optional[ErpStructureFileNode]:
        """Get a single structure definition by name from erp_data/structure/ or erp_data/patterns/."""
        d = LineageService.get_structure_definition(name)
        if not d:
            return None
        return ErpStructureFileNode(
            name=d.get("name", "Unknown"),
            scope=d.get("scope", "CUSTOM"),
            source_type=d.get("sourceType", "MANUAL"),
            destination_table=d.get("destinationTable", ""),
            expected_file_pattern=d.get("expectedFilePattern", ""),
            active=d.get("active", True),
            status=d.get("status", "DRAFT"),
            fields=d.get("fields", []),
            relationships=d.get("relationships", []),
            file_name=d.get("_fileName", ""),
            tables=d.get("tables") if isinstance(d.get("tables"), list) else None,
        )

    @strawberry.field
    def erp_definition_fields(
        self, source_definition_id: str,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ErpDefinitionFieldsResult:
        qs = LineageService.list_fields(source_definition_id)
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ErpDefinitionFieldsResult(
            items=[ErpDefinitionFieldNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def erp_relationship_definitions(
        self, source_definition_id: str,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ErpRelationshipDefinitionsResult:
        qs = LineageService.list_relationships(source_definition_id)
        for rel in qs:
            rel._target_name = rel.target_source_definition.name if rel.target_source_definition_id else ""
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ErpRelationshipDefinitionsResult(
            items=[ErpRelationshipDefinitionNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def erp_related_data(
        self, source_definition_id: str,
        batch_id: Optional[str] = None,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ErpStagingRowsResult:
        # Check for sample staging data first (pattern-based definitions)
        sample_rows = LineageService.load_sample_staging_rows(source_definition_id)
        if sample_rows is not None:
            total = len(sample_rows)
            sliced = sample_rows[offset:offset + limit]
            has_more = (offset + limit) < total
            return ErpStagingRowsResult(
                items=[
                    ErpStagingRowNode(
                        id=strawberry.ID(f"sample-{i}"),
                        batch_id=strawberry.ID("sample"),
                        source_definition_id=strawberry.ID(source_definition_id),
                        row_number=row.get("rowNumber", i + 1),
                        raw_data_json=row.get("rawData", {}),
                        normalized_data_json={},
                        validation_status="PENDING",
                        created_at="",
                    )
                    for i, row in enumerate(sliced)
                ],
                page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
            )

        qs = LineageService.list_staging_rows(source_definition_id, batch_id, offset or 0, limit or 100)
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ErpStagingRowsResult(
            items=[ErpStagingRowNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def erp_field_profile(self, source_definition_id: str, field_name: str) -> Optional[ErpFieldProfile]:
        # Check for sample staging data
        sample_rows = LineageService.load_sample_staging_rows(source_definition_id)
        if sample_rows is not None:
            values = [str(row["rawData"].get(field_name)) for row in sample_rows if row.get("rawData", {}).get(field_name) is not None]
            distinct = list(set(values))
            null_count = sum(1 for row in sample_rows if row.get("rawData", {}).get(field_name) is None)
            return ErpFieldProfile(
                field_name=field_name,
                distinct_values=len(distinct),
                null_count=null_count,
                duplicate_count=len(values) - len(distinct) if values else 0,
                sample_values=distinct[:10],
                nexus_field="",
                invalid_values=[],
            )
        try:
            data = LineageService.get_field_profile(source_definition_id, field_name)
            return ErpFieldProfile(**data)
        except LineageServiceError:
            return None

    @strawberry.field
    def erp_validation_results(
        self, source_definition_id: str,
        severity: Optional[str] = None,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ErpValidationResultsResult:
        qs = LineageService.list_validation_results(source_definition_id, severity=severity)
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ErpValidationResultsResult(
            items=[ErpValidationResultNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def erp_lineage_validation(
        self, source_definition_id: str, destination_table: str
    ) -> Optional[ErpLineageValidationSummary]:
        try:
            definition = LineageService.get_definition(source_definition_id)
            results = LineageService.list_validation_results(source_definition_id)
            total = results.count()
            errors = results.filter(severity="ERROR").count()
            warnings = results.filter(severity="WARNING").count()
            info = results.filter(severity="INFO").count()
            last = results.first()
            return ErpLineageValidationSummary(
                scope=definition.scope,
                source_definition_name=definition.name,
                destination_table=destination_table,
                status="Valid" if errors == 0 else "Blocked",
                total_issues=total,
                errors=errors,
                warnings=warnings,
                info=info,
                last_validated_at=last.created_at.isoformat() if last else None,
            )
        except LineageServiceError:
            return None

    @strawberry.field
    def erp_relationship_graph(
        self, source_definition_id: str, destination_table: str = "",
    ) -> Optional[ErpRelationshipGraphResult]:
        """Return tables, fields, and 1:1 relationships for the relationship designer view.

        Supports both DB-backed definitions and pattern/JSON file definitions.
        """
        from api.types.lineage import (
            ErpGraphTableNode, ErpGraphFieldNode, ErpGraphRelationshipNode, ErpRelationshipGraphResult,
        )

        def _build_field(f: dict) -> ErpGraphFieldNode:
            return ErpGraphFieldNode(
                name=f.get("fieldName", f.get("name", "?")),
                data_type=f.get("dataType", "string"),
                required=f.get("required", False),
                primary_key=f.get("primaryKey", False),
                foreign_key=f.get("foreignKey", False),
                nexus_field=f.get("nexusField", ""),
                validation_state="valid",
            )

        def _read_layout_positions(schema_json: dict | None) -> dict[str, dict]:
            if not schema_json:
                return {}
            layout = schema_json.get("relationshipLayout") if isinstance(schema_json, dict) else None
            if not isinstance(layout, dict):
                return {}
            node_positions = layout.get("nodePositions", {})
            return node_positions if isinstance(node_positions, dict) else {}

        # Try pattern/JSON definition first
        pattern_def = LineageService.get_structure_definition(source_definition_id)
        if pattern_def and pattern_def.get("tables"):
            tables_data = pattern_def["tables"]
            rels_data = pattern_def.get("relationships", [])
            node_positions = _read_layout_positions(pattern_def)
            tables_map: dict[str, ErpGraphTableNode] = {}
            for t in tables_data:
                tname = t.get("name", "?")
                tid = tname  # use table name as ID
                fields = [_build_field(f) for f in t.get("fields", [])]
                pos = node_positions.get(tid, {}) if isinstance(node_positions, dict) else {}
                tables_map[tid] = ErpGraphTableNode(
                    id=strawberry.ID(tid),
                    name=tname,
                    fields=fields,
                    x=pos.get("x", t.get("x")),
                    y=pos.get("y", t.get("y")),
                )
            relationships = [
                ErpGraphRelationshipNode(
                    id=strawberry.ID(f"{r['sourceTable']}-{r['sourceField']}-{r['targetTable']}-{r['targetField']}"),
                    source_table_id=strawberry.ID(r["sourceTable"]),
                    source_entity=r["sourceTable"],
                    source_field=r["sourceField"],
                    target_table_id=strawberry.ID(r["targetTable"]),
                    target_entity=r["targetTable"],
                    target_field=r["targetField"],
                    cardinality="ONE_TO_ONE",
                    required=r.get("required", False),
                    status="valid",
                    source_anchor=r.get("sourceAnchor", "right"),
                    target_anchor=r.get("targetAnchor", "left"),
                )
                for r in rels_data
            ]
            return ErpRelationshipGraphResult(
                tables=list(tables_map.values()),
                relationships=relationships,
                validation_state="valid",
            )

        # Fallback: DB-backed definition
        try:
            definition = LineageService.get_definition(source_definition_id)
            fields_qs = LineageService.list_fields(source_definition_id)
            rels_qs = LineageService.list_relationships(source_definition_id)
            node_positions = _read_layout_positions(definition.schema_json)

            table_fields = [
                ErpGraphFieldNode(
                    name=f.field_name, data_type=f.data_type or "string",
                    required=f.required, primary_key=f.primary_key,
                    foreign_key=f.foreign_key, nexus_field=f.nexus_field or "",
                    validation_state="valid",
                )
                for f in fields_qs
            ]
            main_table = ErpGraphTableNode(
                id=strawberry.ID(source_definition_id),
                name=definition.name,
                fields=table_fields,
                x=(node_positions.get(source_definition_id, {}) or {}).get("x"),
                y=(node_positions.get(source_definition_id, {}) or {}).get("y"),
            )
            tables_map = {source_definition_id: main_table}
            relationships: list[ErpGraphRelationshipNode] = []
            target_ids = set()

            for rel in rels_qs:
                tid = str(rel.target_source_definition_id)
                target_ids.add(tid)
                relationships.append(ErpGraphRelationshipNode(
                    id=strawberry.ID(str(rel.id)),
                    source_table_id=strawberry.ID(source_definition_id),
                    source_entity=source_definition_id,
                    source_field=rel.source_field,
                    target_table_id=strawberry.ID(tid),
                    target_entity=tid,
                    target_field=rel.target_field,
                    cardinality="ONE_TO_ONE",
                    required=rel.required,
                    status="valid",
                    source_anchor="right",
                    target_anchor="left",
                ))

            for tid in target_ids:
                try:
                    tdef = LineageService.get_definition(tid)
                    tfields_qs = LineageService.list_fields(tid)
                    t_fields = [
                        ErpGraphFieldNode(
                            name=f.field_name, data_type=f.data_type or "string",
                            required=f.required, primary_key=f.primary_key,
                            foreign_key=f.foreign_key, nexus_field=f.nexus_field or "",
                            validation_state="valid",
                        )
                        for f in tfields_qs
                    ]
                    tables_map[tid] = ErpGraphTableNode(
                        id=strawberry.ID(tid),
                        name=tdef.name,
                        fields=t_fields,
                        x=(node_positions.get(tid, {}) or {}).get("x"),
                        y=(node_positions.get(tid, {}) or {}).get("y"),
                    )
                except LineageServiceError:
                    tables_map[tid] = ErpGraphTableNode(
                        id=strawberry.ID(tid),
                        name=f"Definition {tid[:8]}",
                        fields=[],
                        x=(node_positions.get(tid, {}) or {}).get("x"),
                        y=(node_positions.get(tid, {}) or {}).get("y"),
                    )

            return ErpRelationshipGraphResult(
                tables=list(tables_map.values()),
                relationships=relationships,
                validation_state="valid",
            )
        except LineageServiceError:
            return None

    @strawberry.field
    def erp_import_batches(
        self, source_definition_id: str,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ErpImportBatchesResult:
        from manufacturing.models.lineage import ErpImportBatch as BatchModel
        qs = BatchModel.objects.filter(source_definition_id=source_definition_id).order_by("-imported_at")
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ErpImportBatchesResult(
            items=[ErpImportBatchNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

