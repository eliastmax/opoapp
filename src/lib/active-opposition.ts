export type ActiveOpposition = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type ActiveOppositionViewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "active"; opposition: ActiveOpposition };
