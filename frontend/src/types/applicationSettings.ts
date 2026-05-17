export interface ApplicationSetting {
  key: string;
  category: string;
  valueType: "STRING" | "BOOLEAN" | "INTEGER" | "DECIMAL" | "JSON";
  value: unknown;
  description: string;
  updatedAt: string;
}

export interface ApplicationSettingInput {
  key: string;
  value: unknown;
}
