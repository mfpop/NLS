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
    def erp_structure_definition(self, name: str) -> Optional[ErpStructureFileNode]:
        """Get a single structure definition by name from erp_data/structure/."""
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
        qs = LineageService.list_staging_rows(source_definition_id, batch_id, offset or 0, limit or 100)
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ErpStagingRowsResult(
            items=[ErpStagingRowNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def erp_field_profile(self, source_definition_id: str, field_name: str) -> Optional[ErpFieldProfile]:
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
        """Return tables, fields, and 1:1 relationships for the relationship designer view."""
        from api.types.lineage import (
            ErpGraphTableNode, ErpGraphFieldNode, ErpGraphRelationshipNode, ErpRelationshipGraphResult,
        )
        try:
            definition = LineageService.get_definition(source_definition_id)
            fields_qs = LineageService.list_fields(source_definition_id)
            rels_qs = LineageService.list_relationships(source_definition_id)

            # Build the main table from the source definition
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
            )
            tables = {source_definition_id: main_table}
            relationships: list[ErpGraphRelationshipNode] = []
            target_ids = set()

            for rel in rels_qs:
                tid = str(rel.target_source_definition_id)
                target_ids.add(tid)
                relationships.append(ErpGraphRelationshipNode(
                    id=strawberry.ID(str(rel.id)),
                    source_table_id=strawberry.ID(source_definition_id),
                    source_field=rel.source_field,
                    target_table_id=strawberry.ID(tid),
                    target_field=rel.target_field,
                    cardinality="ONE_TO_ONE",
                    required=rel.required,
                    status="valid",
                ))

            # Build target tables for referenced definitions
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
                    tables[tid] = ErpGraphTableNode(
                        id=strawberry.ID(tid),
                        name=tdef.name,
                        fields=t_fields,
                    )
                except LineageServiceError:
                    tables[tid] = ErpGraphTableNode(
                        id=strawberry.ID(tid),
                        name=f"Definition {tid[:8]}",
                        fields=[],
                    )

            return ErpRelationshipGraphResult(
                tables=list(tables.values()),
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

    @strawberry.field
    def erp_relationship_graph(
        self, scope: str, source_id: Optional[str] = None, destination_table: Optional[str] = None
    ) -> ErpRelationshipGraph:
        defs = [d for d in LineageService.get_structure_definitions() if d.get("scope") == scope]
        
        nodes = []
        fields = []
        rels = []
        for d in defs:
            node_id = d.get("name", "Unknown")
            nodes.append(ErpRelationshipGraphNodeItem(
                id=node_id,
                name=node_id,
                source_type=d.get("sourceType", "MANUAL"),
                active=d.get("active", True)
            ))
            for f in d.get("fields", []):
                fields.append(ErpRelationshipGraphFieldItem(
                    id=f"{node_id}-{f.get('fieldName', '')}",
                    entity_id=node_id,
                    field_name=f.get('fieldName', ''),
                    primary_key=f.get("primaryKey", False),
                    foreign_key=f.get("foreignKey", False),
                    required=f.get("required", False),
                    nexus_field=f.get("nexusField", ""),
                    data_type=f.get("dataType", "string"),
                ))
            for r in d.get("relationships", []):
                rel_id = r.get("id") or f"{node_id}-{r.get('sourceField')}-{r.get('targetSourceDefinitionId')}-{r.get('targetField')}"
                rels.append(ErpRelationshipGraphRelItem(
                    id=rel_id,
                    source_entity=node_id,
                    source_field=r.get("sourceField", ""),
                    target_entity=r.get("targetSourceDefinitionId", ""),
                    target_field=r.get("targetField", ""),
                    cardinality="ONE_TO_ONE",
                    required=r.get("required", False),
                    status="VALID"
                ))
        return ErpRelationshipGraph(
            nodes=nodes,
            fields=fields,
            relationships=rels,
            validation_state=ErpRelationshipGraphValidationState(status="VALID", issues=[])
        )

    @strawberry.field
    def erp_relationship_validation(
        self, relationship_id: str
    ) -> ErpRelationshipValidation:
        # relationship_id format: source_entity-source_field-target_entity-target_field
        parts = relationship_id.split("-")
        if len(parts) >= 4:
            source_entity = parts[0]
            source_field = parts[1]
            target_entity = parts[2]
            target_field = parts[3]
        else:
            return ErpRelationshipValidation(
                status="INVALID", matched_count=0, missing_count=0,
                duplicate_source_count=0, duplicate_target_count=0,
                orphan_count=0, issues=[]
            )
        
        return ErpRelationshipValidation(
            status="VALID",
            matched_count=0,
            missing_count=0,
            duplicate_source_count=0,
            duplicate_target_count=0,
            orphan_count=0,
            issues=[]
        )
