import type { EntityField } from "../components/EntityWorkspacePage";

interface EntityFieldConfig {
  sections: { title: string; fields: string[] }[];
  fields: EntityField[];
}

export const PLANT_FIELDS: EntityFieldConfig = {
  sections: [
    {
      title: "Plant Identity",
      fields: ["name", "code", "status", "plantType"],
    },
    {
      title: "Contact",
      fields: ["managerName", "managerEmail", "managerPhone"],
    },
    {
      title: "Operations",
      fields: ["operatingSince", "defaultTimezone", "weekStartDay"],
    },
    {
      title: "Location",
      fields: ["building", "address", "city", "state", "country", "zipcode"],
    },
    {
      title: "Manufacturing Focus",
      fields: ["manufacturingFocus"],
    },
    {
      title: "Description",
      fields: ["description"],
    },
  ],
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    {
      key: "plantType",
      label: "Plant Type",
      type: "select",
      options: [], // populated from manufacturing_type reference table
    },
    { key: "managerName", label: "Manager Name", type: "text" },
    { key: "managerEmail", label: "Manager Email", type: "text" },
    { key: "managerPhone", label: "Manager Phone", type: "text" },
    { key: "operatingSince", label: "Operating Since", type: "text" },
    {
      key: "defaultTimezone",
      label: "Default Timezone",
      type: "select",
      options: [], // populated from timezone reference table
    },
    {
      key: "weekStartDay",
      label: "Week Start Day",
      type: "select",
      options: [
        { label: "Monday", value: "monday" },
        { label: "Sunday", value: "sunday" },
        { label: "Saturday", value: "saturday" },
      ],
    },
    { key: "building", label: "Building", type: "text" },
    { key: "address", label: "Address", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "state", label: "State", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "zipcode", label: "ZIP Code", type: "text" },
    { key: "manufacturingFocus", label: "Manufacturing Focus", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
  ],
};

export const PRODUCTION_LINE_FIELDS: EntityFieldConfig = {
  sections: [
    {
      title: "General",
      fields: ["name", "code", "status", "plantId"],
    },
  ],
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    { key: "plantId", label: "Plant", type: "select", options: [] },
  ],
};

export const DEPARTMENT_FIELDS: EntityFieldConfig = {
  sections: [
    {
      title: "General",
      fields: ["name", "code", "status", "plantId", "lineId"],
    },
  ],
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    { key: "plantId", label: "Plant", type: "select", options: [] },
    { key: "lineId", label: "Production Line", type: "select", options: [] },
  ],
};

export const RESOURCE_GROUP_FIELDS: EntityFieldConfig = {
  sections: [
    {
      title: "General",
      fields: ["name", "code", "status", "plantId", "departmentId"],
    },
  ],
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    { key: "plantId", label: "Plant", type: "select", options: [] },
    { key: "departmentId", label: "Department", type: "select", options: [] },
  ],
};

export const RESOURCE_FIELDS: EntityFieldConfig = {
  sections: [
    {
      title: "General",
      fields: ["name", "code", "status", "plantId", "groupId", "resourceType"],
    },
  ],
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    { key: "plantId", label: "Plant", type: "select", options: [] },
    { key: "groupId", label: "Resource Group", type: "select", options: [] },
    {
      key: "resourceType",
      label: "Resource Type",
      type: "select",
      options: [], // populated from reference table
    },
  ],
};
