export type ComparisonOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "LIKE"
  | "IN"
  | "IS"
  | "IS NOT";

export interface FilterCondition {
  field: string;
  operator?: ComparisonOperator;
  value: unknown;
}

export interface ConditionGroup {
  AND?: WhereCondition[];
  OR?: WhereCondition[];
}

export type FlatConditions = Record<string, unknown>;

export type WhereCondition = FlatConditions | FilterCondition | ConditionGroup;

export interface QueryWithParams {
  query: string;
  params: unknown[];
}
