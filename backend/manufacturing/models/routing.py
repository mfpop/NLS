from django.db import models
from django.core.exceptions import ValidationError
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class ProductModel(models.Model):
    family = models.ForeignKey(
        "manufacturing.ProductFamily", on_delete=models.PROTECT,
        related_name="models", null=True, blank=True,
    )
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_product_model"
        ordering = ["name"]
        verbose_name = "Product Model"
        verbose_name_plural = "Product Models"
        constraints = [
            models.UniqueConstraint(fields=["family", "code"], name="uq_product_model_family_code"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProductFamily(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_product_family"
        ordering = ["name"]
        verbose_name = "Product Family"
        verbose_name_plural = "Product Families"

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProductVariant(models.Model):
    model = models.ForeignKey(
        ProductModel, on_delete=models.PROTECT, related_name="variants",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    configuration_summary = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    part_number = models.CharField(max_length=128, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_product_variant"
        ordering = ["model", "name"]
        constraints = [
            models.UniqueConstraint(fields=["model", "code"], name="uq_product_variant_model_code"),
        ]

    def __str__(self):
        return f"{self.model.code}-{self.code}"


class PartNumber(models.Model):
    family = models.ForeignKey(
        ProductFamily, on_delete=models.PROTECT, related_name="part_numbers",
    )
    model = models.ForeignKey(
        ProductModel, on_delete=models.PROTECT, related_name="part_numbers",
    )
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.PROTECT,
        related_name="part_numbers", null=True, blank=True,
    )
    part_number = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    revision = models.CharField(max_length=50, blank=True, default="")
    uom = models.CharField(max_length=50, blank=True, default="EA")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_part_number"
        ordering = ["part_number"]
        indexes = [
            models.Index(fields=["family", "model", "variant"], name="part_hierarchy_idx"),
            models.Index(fields=["is_active", "status"], name="part_active_status_idx"),
        ]

    def clean(self):
        if self.model_id and self.family_id and self.model.family_id and self.model.family_id != self.family_id:
            raise ValidationError("Part number family must match product model family.")
        if self.variant_id and self.variant.model_id != self.model_id:
            raise ValidationError("Part number variant must belong to the selected product model.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.part_number


class ProcessFlow(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    product_model = models.ForeignKey(
        ProductModel, on_delete=models.CASCADE, related_name="process_flows",
        null=True, blank=True,
    )
    part_number = models.ForeignKey(
        PartNumber, on_delete=models.SET_NULL, related_name="process_flows",
        null=True, blank=True,
    )
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.CASCADE,
        related_name="process_flows", null=True, blank=True,
    )
    version = models.CharField(max_length=20, blank=True, default="1.0")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_process_flow"
        ordering = ["name"]
        verbose_name = "Process Flow"
        verbose_name_plural = "Process Flows"

    def __str__(self):
        return f"{self.name} v{self.version}"


class ProcessStep(models.Model):
    ENTITY_TYPE_CHOICES = [
        ("DEPARTMENT", "Department"),
        ("RESOURCE_GROUP", "Resource Group"),
        ("RESOURCE", "Resource"),
    ]

    process_flow = models.ForeignKey(
        ProcessFlow, on_delete=models.CASCADE, related_name="steps",
    )
    sequence = models.IntegerField(default=0)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.CharField(max_length=50)
    lead_time_minutes = models.FloatField(default=0, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_process_step"
        ordering = ["process_flow", "sequence"]
        verbose_name = "Process Step"
        verbose_name_plural = "Process Steps"

    def __str__(self):
        return f"{self.process_flow.name} / {self.name}"


class RoutingStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    ARCHIVED = "ARCHIVED", "Archived"


class ScheduleSource(models.TextChoices):
    PLANT = "PLANT", "Plant"
    LINE = "LINE", "Line"
    DEPARTMENT = "DEPARTMENT", "Department"
    RESOURCE_GROUP = "RESOURCE_GROUP", "Resource Group"
    RESOURCE = "RESOURCE", "Resource"
    CUSTOM = "CUSTOM", "Custom"


class Routing(TimeStampedModel):
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.CASCADE,
        related_name="routings",
        db_index=True,
    )
    product_family = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    product_model = models.ForeignKey(
        ProductModel, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routings",
        db_index=True,
    )
    part_number = models.ForeignKey(
        PartNumber, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routings",
        db_index=True,
    )
    version = models.CharField(max_length=20, default="1.0")
    status = models.CharField(
        max_length=20, choices=RoutingStatus.choices, default=RoutingStatus.DRAFT,
        db_index=True,
    )
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_routing"
        ordering = ["-created_at"]
        verbose_name = "Routing"
        verbose_name_plural = "Routings"
        indexes = [
            models.Index(fields=["production_line", "status"]),
            models.Index(fields=["production_line", "product_model", "status"], name="mfg_route_line_model_stat_idx"),
            models.Index(fields=["production_line", "part_number", "status"], name="mfg_route_line_part_stat_idx"),
            models.Index(fields=["production_line", "product_model"]),
            models.Index(fields=["production_line", "product_family"]),
        ]

    def clean(self):
        if self.status != RoutingStatus.ACTIVE or not self.production_line_id:
            return
        siblings = Routing.objects.filter(production_line_id=self.production_line_id, status=RoutingStatus.ACTIVE)
        if self.part_number_id:
            siblings = siblings.filter(part_number_id=self.part_number_id)
        else:
            siblings = siblings.filter(part_number__isnull=True, product_model_id=self.product_model_id)
        if self.pk:
            siblings = siblings.exclude(pk=self.pk)
        if siblings.exists():
            raise ValidationError("Only one active routing is allowed per production line and part number/model.")

    def __str__(self):
        return f"Routing v{self.version} for {self.production_line.name}"


class RoutingStep(TimeStampedModel):
    routing = models.ForeignKey(
        Routing, on_delete=models.CASCADE, related_name="steps",
        db_index=True,
    )
    sequence = models.IntegerField(db_index=True)
    department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    resource = models.ForeignKey(
        "manufacturing.Resource", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    standard_work = models.ForeignKey(
        ProcessFlow, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    cycle_time_sec = models.FloatField(default=0)
    setup_time_sec = models.FloatField(null=True, blank=True, default=0)
    changeover_time_sec = models.FloatField(null=True, blank=True, default=0)
    required_operators = models.IntegerField(null=True, blank=True, default=1)
    schedule_source = models.CharField(
        max_length=20, choices=ScheduleSource.choices,
        default=ScheduleSource.LINE,
    )
    buffer_type = models.CharField(max_length=50, null=True, blank=True)
    wip_min = models.IntegerField(null=True, blank=True)
    wip_max = models.IntegerField(null=True, blank=True)
    quality_checkpoint = models.BooleanField(default=False)
    rework_allowed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_routing_step"
        ordering = ["routing", "sequence"]
        verbose_name = "Routing Step"
        verbose_name_plural = "Routing Steps"
        constraints = [
            models.UniqueConstraint(
                fields=["routing", "sequence"],
                name="uq_routing_step_sequence",
            ),
        ]
        indexes = [
            models.Index(fields=["routing", "sequence"]),
        ]

    def __str__(self):
        return f"Step {self.sequence}: {self.department.name if self.department else 'Unassigned'}"


class MaterialState(models.TextChoices):
    RAW_MATERIAL = "RAW_MATERIAL", "Raw Material"
    WIP = "WIP", "Work in Process"
    FINISHED_GOOD = "FINISHED_GOOD", "Finished Good"
    SCRAP = "SCRAP", "Scrap"


class InventoryLocationType(models.TextChoices):
    WAREHOUSE = "WAREHOUSE", "Warehouse"
    LINE_SIDE = "LINE_SIDE", "Line-side"
    BUFFER = "BUFFER", "Buffer"
    SUPERMARKET = "SUPERMARKET", "Supermarket"
    FIFO = "FIFO", "FIFO"
    KANBAN = "KANBAN", "Kanban"
    WIP = "WIP", "WIP"
    FINISHED_GOODS = "FINISHED_GOODS", "Finished Goods"


class MaterialMovementType(models.TextChoices):
    RECEIVE = "RECEIVE", "Receive"
    ISSUE = "ISSUE", "Issue"
    TRANSFER = "TRANSFER", "Transfer"
    CONSUME = "CONSUME", "Consume"
    PRODUCE = "PRODUCE", "Produce"
    SCRAP = "SCRAP", "Scrap"


class MaterialMovementRuleType(models.TextChoices):
    LINE_SIDE = "LINE_SIDE", "Line-side"
    BUFFER = "BUFFER", "Buffer"
    SUPERMARKET = "SUPERMARKET", "Supermarket"
    FIFO = "FIFO", "FIFO"
    KANBAN = "KANBAN", "Kanban"
    NEXT_OPERATION = "NEXT_OPERATION", "Next Operation"
    FINISHED_GOODS = "FINISHED_GOODS", "Finished Goods"


class Material(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    material_state = models.CharField(
        max_length=30, choices=MaterialState.choices, default=MaterialState.RAW_MATERIAL,
    )
    unit_of_measure = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )

    class Meta:
        db_table = "manufacturing_material"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["material_state", "status"], name="mfg_mat_state_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class BOM(TimeStampedModel):
    product_model = models.ForeignKey(
        ProductModel, on_delete=models.CASCADE, related_name="boms",
        db_index=True,
    )
    part_number = models.ForeignKey(
        PartNumber, on_delete=models.SET_NULL,
        related_name="boms", null=True, blank=True, db_index=True,
    )
    version = models.CharField(max_length=20, default="1.0")
    status = models.CharField(
        max_length=20, choices=RoutingStatus.choices, default=RoutingStatus.DRAFT,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_bom"
        ordering = ["product_model", "-created_at"]
        indexes = [
            models.Index(fields=["product_model", "status"], name="mfg_bom_model_status_idx"),
            models.Index(fields=["part_number", "status"], name="mfg_bom_part_status_idx"),
        ]

    def clean(self):
        if self.status != RoutingStatus.ACTIVE or not self.product_model_id:
            return
        siblings = BOM.objects.filter(status=RoutingStatus.ACTIVE)
        if self.part_number_id:
            siblings = siblings.filter(part_number_id=self.part_number_id)
        else:
            siblings = siblings.filter(part_number__isnull=True, product_model_id=self.product_model_id)
        if self.pk:
            siblings = siblings.exclude(pk=self.pk)
        if siblings.exists():
            raise ValidationError("Only one active BOM is allowed per part number/model.")

    def __str__(self):
        return f"BOM {self.product_model} v{self.version}"


class BOMItem(TimeStampedModel):
    bom = models.ForeignKey(BOM, on_delete=models.CASCADE, related_name="items")
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="bom_items")
    quantity = models.FloatField(default=1)
    scrap_factor = models.FloatField(default=0)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_bom_item"
        ordering = ["bom", "material__name"]
        constraints = [
            models.UniqueConstraint(fields=["bom", "material"], name="uq_bom_material"),
        ]

    def __str__(self):
        return f"{self.material} x {self.quantity}"


class InventoryLocation(TimeStampedModel):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        related_name="inventory_locations",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    location_type = models.CharField(
        max_length=30, choices=InventoryLocationType.choices,
        default=InventoryLocationType.WAREHOUSE,
    )
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )

    class Meta:
        db_table = "manufacturing_inventory_location"
        ordering = ["plant", "name"]
        constraints = [
            models.UniqueConstraint(fields=["plant", "code"], name="uq_inventory_location_plant_code"),
        ]
        indexes = [
            models.Index(fields=["plant", "location_type"], name="mfg_invloc_plant_type_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.location_type})"


class WarehouseType(models.TextChoices):
    RM = "RM", "Raw Material"
    WIP = "WIP", "WIP"
    FG = "FG", "Finished Goods"
    SCRAP = "SCRAP", "Scrap"
    QUARANTINE = "QUARANTINE", "Quarantine"
    SPARES = "SPARES", "Spares"
    GENERAL = "GENERAL", "General"


class Warehouse(TimeStampedModel):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        related_name="warehouses",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    warehouse_type = models.CharField(max_length=30, choices=WarehouseType.choices, default=WarehouseType.GENERAL)
    location = models.CharField(max_length=200, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_warehouse"
        ordering = ["plant", "code"]
        constraints = [
            models.UniqueConstraint(fields=["plant", "code"], name="uq_warehouse_plant_code"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class ReplenishmentMode(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    KANBAN = "KANBAN", "Kanban"
    CONWIP = "CONWIP", "Conwip"
    PULL = "PULL", "Pull"
    PUSH = "PUSH", "Push"
    REORDER_POINT = "REORDER_POINT", "Reorder Point"
    MIN_MAX = "MIN_MAX", "Min/Max"


class MaterialBinType(models.TextChoices):
    RM = "RM", "Raw Material"
    INPUT = "INPUT", "Input"
    OUTPUT = "OUTPUT", "Output"
    WIP = "WIP", "WIP"
    FIFO = "FIFO", "FIFO"
    SUPERMARKET = "SUPERMARKET", "Supermarket"
    FG = "FG", "Finished Goods"
    SCRAP = "SCRAP", "Scrap"
    QUARANTINE = "QUARANTINE", "Quarantine"
    SPARES = "SPARES", "Spares"
    LINE_SIDE = "LINE_SIDE", "Line Side"


class MaterialBin(TimeStampedModel):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        related_name="material_bins",
    )
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.PROTECT,
        related_name="material_bins",
        null=True, blank=True,
    )
    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.PROTECT,
        related_name="material_bins",
        null=True, blank=True,
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    bin_type = models.CharField(max_length=30, choices=MaterialBinType.choices)
    material = models.ForeignKey(
        Material, on_delete=models.SET_NULL,
        related_name="material_bins",
        null=True, blank=True,
    )
    material_group = models.CharField(max_length=100, blank=True, default="")
    capacity = models.FloatField(default=0)
    uom = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    replenishment_mode = models.CharField(
        max_length=30, choices=ReplenishmentMode.choices,
        null=True, blank=True,
    )
    fifo_enabled = models.BooleanField(default=False)
    supermarket_enabled = models.BooleanField(default=False)
    location_code = models.CharField(max_length=80, blank=True, default="")
    location_reference = models.CharField(max_length=200, blank=True, default="")
    # TODO: warehouse_code was migrated to Warehouse FK (see docs/MATERIAL_BIN_MIGRATION_NOTES.md).
    warehouse = models.ForeignKey(
        "manufacturing.Warehouse", on_delete=models.PROTECT,
        related_name="material_bins", null=True, blank=True,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "manufacturing_material_bin"
        ordering = ["plant", "code"]
        constraints = [
            models.UniqueConstraint(fields=["plant", "code"], name="uq_material_bin_plant_code"),
            models.CheckConstraint(condition=models.Q(capacity__gte=0), name="ck_material_bin_capacity_gte_0"),
        ]
        indexes = [
            models.Index(fields=["plant", "bin_type", "resource_group", "material"], name="mfg_bin_scope_idx"),
            models.Index(fields=["plant", "is_active"], name="mfg_bin_plant_active_idx"),
            models.Index(fields=["plant", "production_line"], name="mfg_bin_prod_line_idx"),
        ]

    def clean(self):
        # Validate production_line and resource_group plant consistency
        if self.production_line_id and self.plant_id and self.production_line.plant_id != self.plant_id:
            raise ValidationError("Material bin production line must belong to the same plant.")
        if self.resource_group_id and self.plant_id and self.resource_group.department.plant_id != self.plant_id:
            raise ValidationError("Material bin resource group must belong to the same plant.")
        # Warehouse must belong to same plant (no cross-plant assignment)
        if getattr(self, "warehouse_id", None) and self.plant_id and self.warehouse and self.warehouse.plant_id != self.plant_id:
            raise ValidationError("Material bin warehouse must belong to the same plant.")
        if self.capacity is not None and self.capacity < 0:
            raise ValidationError("Material bin capacity cannot be negative.")
        # Enforce ownership rules by bin type
        if self.bin_type in (MaterialBinType.RM, MaterialBinType.FG, MaterialBinType.SCRAP, MaterialBinType.QUARANTINE) and not getattr(self, "warehouse_id", None):
            raise ValidationError(f"{self.get_bin_type_display()} bins should reference a warehouse.")
        if self.bin_type in (MaterialBinType.INPUT, MaterialBinType.OUTPUT, MaterialBinType.WIP, MaterialBinType.LINE_SIDE) and not self.resource_group_id and not self.production_line_id:
            raise ValidationError(f"{self.get_bin_type_display()} bins should belong to a resource group or production flow.")

    @property
    def warehouse_code(self):
        return self.warehouse.code if self.warehouse else ""

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.name}"


class OperationInput(TimeStampedModel):
    routing_step = models.ForeignKey(
        RoutingStep, on_delete=models.CASCADE, related_name="material_inputs",
    )
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="operation_inputs")
    quantity = models.FloatField(default=1)
    source_location = models.ForeignKey(
        InventoryLocation, on_delete=models.PROTECT,
        related_name="operation_inputs",
        null=True, blank=True,
    )
    source_bin = models.ForeignKey(
        MaterialBin, on_delete=models.PROTECT,
        related_name="operation_inputs",
        null=True, blank=True,
    )
    material_state = models.CharField(
        max_length=30, choices=MaterialState.choices, default=MaterialState.RAW_MATERIAL,
    )

    class Meta:
        db_table = "manufacturing_operation_input"
        ordering = ["routing_step", "material__name"]


class OperationOutput(TimeStampedModel):
    routing_step = models.ForeignKey(
        RoutingStep, on_delete=models.CASCADE, related_name="material_outputs",
    )
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="operation_outputs")
    quantity = models.FloatField(default=1)
    target_location = models.ForeignKey(
        InventoryLocation, on_delete=models.PROTECT,
        related_name="operation_outputs",
        null=True, blank=True,
    )
    destination_bin = models.ForeignKey(
        MaterialBin, on_delete=models.PROTECT,
        related_name="operation_outputs",
        null=True, blank=True,
    )
    material_state = models.CharField(
        max_length=30, choices=MaterialState.choices, default=MaterialState.WIP,
    )

    class Meta:
        db_table = "manufacturing_operation_output"
        ordering = ["routing_step", "material__name"]


class MaterialMovementRule(TimeStampedModel):
    routing_step = models.OneToOneField(
        RoutingStep, on_delete=models.CASCADE, related_name="material_movement_rule",
    )
    rule_type = models.CharField(
        max_length=30, choices=MaterialMovementRuleType.choices,
        default=MaterialMovementRuleType.NEXT_OPERATION,
    )
    source_location = models.ForeignKey(
        InventoryLocation, on_delete=models.PROTECT,
        related_name="movement_rules_as_source",
        null=True, blank=True,
    )
    source_bin = models.ForeignKey(
        MaterialBin, on_delete=models.PROTECT,
        related_name="movement_rules_as_source",
        null=True, blank=True,
    )
    destination_location = models.ForeignKey(
        InventoryLocation, on_delete=models.PROTECT,
        related_name="movement_rules_as_destination",
        null=True, blank=True,
    )
    destination_bin = models.ForeignKey(
        MaterialBin, on_delete=models.PROTECT,
        related_name="movement_rules_as_destination",
        null=True, blank=True,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_material_movement_rule"
        ordering = ["routing_step__routing", "routing_step__sequence"]


class MaterialMovement(TimeStampedModel):
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="movements")
    quantity = models.FloatField(default=0)
    movement_type = models.CharField(
        max_length=30, choices=MaterialMovementType.choices,
        default=MaterialMovementType.TRANSFER,
    )
    material_state = models.CharField(
        max_length=30, choices=MaterialState.choices, default=MaterialState.RAW_MATERIAL,
    )
    from_location = models.ForeignKey(
        InventoryLocation, on_delete=models.PROTECT,
        related_name="outgoing_movements",
        null=True, blank=True,
    )
    to_location = models.ForeignKey(
        InventoryLocation, on_delete=models.PROTECT,
        related_name="incoming_movements",
        null=True, blank=True,
    )
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="material_movements",
    )
    routing_step = models.ForeignKey(
        RoutingStep, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="material_movements",
    )
    reference = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_material_movement"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["material", "created_at"], name="mfg_move_material_date_idx"),
            models.Index(fields=["production_line", "created_at"], name="mfg_move_line_date_idx"),
        ]
