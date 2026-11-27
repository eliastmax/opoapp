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

export function oppositionDescription({ code, description }: Pick<ActiveOpposition, "code" | "description">) {
  return code === "celador-sms"
    ? "Temario parcial en preparación. Puedes practicar los temas disponibles."
    : description;
}
