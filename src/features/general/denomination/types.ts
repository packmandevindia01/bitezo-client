export interface DenominationItem {
  id?: number;
  name: string;
  value: number;
}

export interface DenominationPayload {
  denominations: Array<Pick<DenominationItem, "name" | "value">>;
}

export interface DenominationMutationData {
  id: number;
}
