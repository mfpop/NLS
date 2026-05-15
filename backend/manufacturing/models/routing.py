from django.db import models
from django.db.models import Q
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class ProductModel(models.Model):
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

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProcessFlow(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    product_model = models.ForeignKey(
        ProductModel, on_delete=models.CASCADE, related_name="process_flows",
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
        constraints = [
            models.UniqueConstraint(
                fields=["production_line", "product_model"],
                condition=Q(status=RoutingStatus.ACTIVE),
                name="uq_line_model_active_routing",
            ),
        ]
        indexes = [
            models.Index(fields=["production_line", "status"]),
            models.Index(fields=["production_line", "product_model"]),
            models.Index(fields=["production_line", "product_family"]),
        ]

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
    version = models.CharField(max_length=20, default="1.0")
    status = models.CharField(
        max_length=20, choices=RoutingStatus.choices, default=RoutingStatus.DRAFT,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_bom"
        ordering = ["product_model", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["product_model"],
                condition=Q(status=RoutingStatus.ACTIVE),
                name="uq_product_model_active_bom",
            ),
        ]

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
    destination_location = models.ForeignKey(
        InventoryLocation, on_delete=models.PROTECT,
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
