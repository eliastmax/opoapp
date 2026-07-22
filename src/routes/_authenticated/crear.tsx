import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, LockKeyhole, Search } from "lucide-react";
import type { Dificultad } from "@/lib/csv-parser";
import { keepActiveFailureIds } from "@/lib/active-failures";
import { keepActiveDoubtIds } from "@/lib/active-doubts";
import {
  LEARNING_STAGE_DESCRIPTIONS,
  LEARNING_STAGE_LABELS,
  LEARNING_STAGES,
  isStageUnlocked,
  learningStage,
  stageRequirements,
  type LearningStage,
} from "@/lib/learning-stages";

export const Route = createFileRoute("/_authenticated/crear")({
  component: CrearPage,
});

type Modalidad = "mezcladas" | "nuevas" | "falladas" | "dudas";
const DIFICULTADES: Dificultad[] = ["facil", "medio", "dificil"];
const CANTIDADES = [5, 10, 20, 30, 50] as const;

function CrearPage() {
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [subtopicIds, setSubtopicIds] = useState<string[]>([]);
  const [subtopicDialogOpen, setSubtopicDialogOpen] = useState(false);
  const [draftSubtopicIds, setDraftSubtopicIds] = useState<string[]>([]);
  const [subtopicSearch, setSubtopicSearch] = useState("");
  const [difs, setDifs] = useState<Dificultad[]>([...DIFICULTADES]);
  const [cantidad, setCantidad] = useState<number>(10);
  const [modalidad, setModalidad] = useState<Modalidad>("mezcladas");
  const [selectedStage, setSelectedStage] = useState<LearningStage>("aprendizaje");
  const [stageFreeMode, setStageFreeMode] = useState(false);
  const [pendingLockedStage, setPendingLockedStage] = useState<LearningStage | null>(null);
  const [starting, setStarting] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () =>
      (await supabase.from("subjects").select("id, nombre").order("nombre")).data ?? [],
  });
  const { data: topics } = useQuery({
    queryKey: ["topics", subjectId],
    enabled: !!subjectId,
    queryFn: async () =>
      (
        await supabase
          .from("topics")
          .select("id, numero, nombre")
          .eq("subject_id", subjectId)
          .order("numero")
      ).data ?? [],
  });
  const { data: subtopics } = useQuery({
    queryKey: ["subtopics", topicId],
    enabled: !!topicId,
    queryFn: async () =>
      (
        await supabase
          .from("subtopics")
          .select("id, nombre")
          .eq("topic_id", topicId)
          .order("nombre")
      ).data ?? [],
  });
  const { data: stageProgress } = useQuery({
    queryKey: ["learning-stage-progress", topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_learning_stage_progress");
      if (error) throw error;
      return (data ?? []).find((row) => row.topic_id === topicId) ?? null;
    },
  });

  const canStart = useMemo(
    () => subjectId && topicId && difs.length > 0,
    [subjectId, topicId, difs],
  );

  const filteredSubtopics = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es");
    const query = normalize(subtopicSearch.trim());
    if (!query) return subtopics ?? [];
    return (subtopics ?? []).filter((subtopic) => normalize(subtopic.nombre).includes(query));
  }, [subtopics, subtopicSearch]);

  // Auto-select when only one option exists
  useEffect(() => {
    if (subjects && subjects.length === 1 && !subjectId) {
      setSubjectId(subjects[0].id);
      setTopicId("");
      setSubtopicIds([]);
    }
  }, [subjects, subjectId]);

  useEffect(() => {
    if (subjectId && topics && topics.length === 1 && !topicId) {
      setTopicId(topics[0].id);
      setSubtopicIds([]);
    }
  }, [subjectId, topics, topicId]);

  useEffect(() => {
    if (topicId && subtopics && subtopics.length === 1 && subtopicIds.length === 0) {
      setSubtopicIds([subtopics[0].id]);
    }
  }, [topicId, subtopics, subtopicIds.length]);

  useEffect(() => {
    const recommended = learningStage(stageProgress?.recommended_stage);
    setSelectedStage(recommended);
    setStageFreeMode(false);
  }, [topicId, stageProgress?.recommended_stage]);

  const hideSubject = !!subjects && subjects.length === 1;
  const hideTopic = !!topics && topics.length === 1;
  const hideSubtopic = !!subtopics && subtopics.length <= 1;

  function handleSubtopicDialogOpenChange(open: boolean) {
    if (open) {
      setDraftSubtopicIds(subtopicIds);
      setSubtopicSearch("");
    }
    setSubtopicDialogOpen(open);
  }

  function chooseStage(stage: LearningStage) {
    if (!stageProgress || isStageUnlocked(stageProgress, stage)) {
      setSelectedStage(stage);
      setStageFreeMode(false);
      return;
    }
    setPendingLockedStage(stage);
  }

  async function iniciar() {
    if (!canStart) return;
    setStarting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      if (modalidad === "mezcladas") {
        const { data: smartTest, error: smartError } = await supabase.rpc("create_level_test", {
          p_topic_id: topicId,
          p_learning_stage: selectedStage,
          p_free_mode: stageFreeMode,
          p_subtopic_ids: subtopicIds.length > 0 ? subtopicIds : undefined,
          p_difficulties: difs,
          p_question_count: cantidad,
        });
        if (smartError) throw smartError;

        const created = smartTest?.[0];
        if (!created) throw new Error("No se pudo crear el test inteligente");
        if (created.selected_count < cantidad) {
          toast.warning(`Solo hay ${created.selected_count} preguntas disponibles`);
        }

        navigate({ to: "/test/$id", params: { id: created.test_id } });
        return;
      }

      // Query pool
      let q = supabase
        .from("questions")
        .select("id")
        .eq("activa", true)
        .eq("topic_id", topicId)
        .in("dificultad", difs);
      q =
        selectedStage === "aprendizaje"
          ? q.or("nivel_pedagogico.eq.aprendizaje,nivel_pedagogico.is.null")
          : q.eq("nivel_pedagogico", selectedStage);
      if (subtopicIds.length > 0) q = q.in("subtopic_id", subtopicIds);
      const { data: pool, error: e1 } = await q;
      if (e1) throw e1;
      let ids = (pool ?? []).map((p) => p.id);

      if (modalidad === "nuevas") {
        const { data: answered } = await supabase
          .from("test_answers")
          .select("question_id, correcta");
        const seen = new Set((answered ?? []).map((a) => a.question_id));
        ids = ids.filter((id) => !seen.has(id));
      } else if (modalidad === "falladas") {
        let failedQuery = supabase
          .from("active_failed_questions")
          .select("question_id")
          .eq("user_id", userId)
          .eq("topic_id", topicId)
          .in("dificultad", difs);
        if (subtopicIds.length > 0) failedQuery = failedQuery.in("subtopic_id", subtopicIds);
        const { data: activeFailures, error: activeFailuresError } = await failedQuery;
        if (activeFailuresError) throw activeFailuresError;
        ids = keepActiveFailureIds(ids, activeFailures ?? []);
      } else if (modalidad === "dudas") {
        let doubtQuery = supabase
          .from("active_doubt_questions")
          .select("question_id")
          .eq("user_id", userId)
          .eq("topic_id", topicId)
          .in("dificultad", difs);
        if (subtopicIds.length > 0) doubtQuery = doubtQuery.in("subtopic_id", subtopicIds);
        const { data: activeDoubts, error: activeDoubtsError } = await doubtQuery;
        if (activeDoubtsError) throw activeDoubtsError;
        ids = keepActiveDoubtIds(ids, activeDoubts ?? []);
      }

      if (ids.length === 0) {
        toast.error("No hay preguntas con esos filtros");
        setStarting(false);
        return;
      }
      if (ids.length < cantidad) toast.warning(`Solo hay ${ids.length} preguntas disponibles`);

      // shuffle
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const chosen = ids.slice(0, Math.min(cantidad, ids.length));

      const { data: test, error: eTest } = await supabase
        .from("tests")
        .insert({
          user_id: userId,
          tipo: modalidad,
          learning_stage: selectedStage,
          stage_free_mode: stageFreeMode,
          numero_preguntas: chosen.length,
          sin_responder: chosen.length,
        })
        .select()
        .single();
      if (eTest) throw eTest;

      const answers = chosen.map((qid, i) => ({
        user_id: userId,
        test_id: test.id,
        question_id: qid,
        orden: i + 1,
      }));
      const { error: eAns } = await supabase.from("test_answers").insert(answers);
      if (eAns) throw eAns;

      navigate({ to: "/test/$id", params: { id: test.id } });
    } catch (e) {
      toast.error((e as Error).message);
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Crear test</h1>
        <p className="text-sm text-muted-foreground">Configura tu test personalizado</p>
      </header>

      <Card className="p-4 space-y-4">
        {!hideSubject && (
          <div className="space-y-1.5">
            <Label>Materia</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                setTopicId("");
                setSubtopicIds([]);
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecciona materia" />
              </SelectTrigger>
              <SelectContent>
                {(subjects ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjects && subjects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Aún no tienes materias. Importa un CSV primero.
              </p>
            )}
          </div>
        )}

        {subjectId && !hideTopic && (
          <div className="space-y-1.5">
            <Label>Tema</Label>
            <Select
              value={topicId}
              onValueChange={(v) => {
                setTopicId(v);
                setSubtopicIds([]);
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecciona tema" />
              </SelectTrigger>
              <SelectContent>
                {(topics ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.numero}. {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {topicId && subtopics && subtopics.length > 0 && !hideSubtopic && (
          <div className="space-y-1.5">
            <Label>Subapartados (opcional)</Label>
            <Dialog open={subtopicDialogOpen} onOpenChange={handleSubtopicDialogOpenChange}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-between px-3 font-normal"
                >
                  <span className="truncate">
                    {subtopicIds.length === 0
                      ? "Todos los subapartados"
                      : subtopicIds.length === 1
                        ? "1 seleccionado"
                        : `${subtopicIds.length} seleccionados`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DialogTrigger>

              <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-lg p-0">
                <DialogHeader className="border-b p-4 pr-10 text-left">
                  <DialogTitle>Elegir subapartados</DialogTitle>
                  <DialogDescription>
                    Si no seleccionas ninguno, se utilizarán todos.
                  </DialogDescription>
                </DialogHeader>

                {subtopics.length > 6 && (
                  <div className="border-b p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={subtopicSearch}
                        onChange={(event) => setSubtopicSearch(event.target.value)}
                        placeholder="Buscar subapartado"
                        aria-label="Buscar subapartado"
                        className="h-11 pl-9"
                      />
                    </div>
                  </div>
                )}

                <div className="max-h-[50vh] space-y-1 overflow-y-auto p-3">
                  {filteredSubtopics.map((subtopic) => {
                    const checked = draftSubtopicIds.includes(subtopic.id);
                    return (
                      <label
                        key={subtopic.id}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(selected) =>
                            setDraftSubtopicIds((previous) =>
                              selected
                                ? previous.includes(subtopic.id)
                                  ? previous
                                  : [...previous, subtopic.id]
                                : previous.filter((id) => id !== subtopic.id),
                            )
                          }
                        />
                        <span>{subtopic.nombre}</span>
                      </label>
                    );
                  })}
                  {filteredSubtopics.length === 0 && (
                    <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                      No hay subapartados que coincidan con la búsqueda.
                    </p>
                  )}
                </div>

                <DialogFooter className="flex-row gap-2 border-t p-4 sm:space-x-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSubtopicIds([]);
                      setSubtopicDialogOpen(false);
                    }}
                  >
                    Usar todos
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => {
                      setSubtopicIds(draftSubtopicIds);
                      setSubtopicDialogOpen(false);
                    }}
                  >
                    Aplicar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <p className="text-xs text-muted-foreground">
              Puedes limitar el test a uno o varios subapartados.
            </p>
          </div>
        )}

        {topicId && stageProgress && (
          <div className="space-y-2">
            <div>
              <Label>Nivel de preparación</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Avanzas cuando demuestras conocimiento; repetir tests no desbloquea por sí solo.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {LEARNING_STAGES.map((stage) => {
                const unlocked = isStageUnlocked(stageProgress, stage);
                const active = selectedStage === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => chooseStage(stage)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active ? "border-primary bg-primary/10" : "bg-background hover:bg-muted/60"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                      {LEARNING_STAGE_LABELS[stage]}
                      {active ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : !unlocked ? (
                        <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                      {LEARNING_STAGE_DESCRIPTIONS[stage]}
                    </span>
                  </button>
                );
              })}
            </div>
            {stageFreeMode && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                Modo libre: este test quedará en el historial, pero no contará para desbloquear
                fases.
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Dificultad</Label>
          <div className="flex gap-2">
            {DIFICULTADES.map((d) => {
              const active = difs.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() =>
                    setDifs((prev) => (active ? prev.filter((x) => x !== d) : [...prev, d]))
                  }
                  className={`flex-1 h-11 rounded-md border text-sm font-medium capitalize ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nº de preguntas</Label>
          <div className="grid grid-cols-5 gap-2">
            {CANTIDADES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCantidad(n)}
                className={`h-11 rounded-md border text-sm font-semibold ${cantidad === n ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Modalidad</Label>
          <Select value={modalidad} onValueChange={(v) => setModalidad(v as Modalidad)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mezcladas">Mezcladas · selección inteligente</SelectItem>
              <SelectItem value="nuevas">Nunca realizadas</SelectItem>
              <SelectItem value="falladas">Falladas</SelectItem>
              <SelectItem value="dudas">Marcadas como duda</SelectItem>
            </SelectContent>
          </Select>
          {modalidad === "mezcladas" && (
            <p className="text-xs text-muted-foreground">
              Prioriza preguntas útiles y reduce repeticiones recientes sin salir de tus filtros.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Resumen</div>
        <ul className="text-sm space-y-1">
          <li>
            Materia:{" "}
            <span className="font-medium">
              {subjects?.find((s) => s.id === subjectId)?.nombre ?? "—"}
            </span>
          </li>
          <li>
            Tema:{" "}
            <span className="font-medium">
              {topics?.find((t) => t.id === topicId)?.nombre ?? "—"}
            </span>
          </li>
          <li>
            Subapartados:{" "}
            <span className="font-medium">
              {subtopicIds.length === 0 ? "Todos" : subtopicIds.length}
            </span>
          </li>
          <li>
            Dificultad: <span className="font-medium capitalize">{difs.join(", ") || "—"}</span>
          </li>
          <li>
            Preguntas: <span className="font-medium">{cantidad}</span>
          </li>
          <li>
            Nivel: <span className="font-medium">{LEARNING_STAGE_LABELS[selectedStage]}</span>
            {stageFreeMode ? " · modo libre" : ""}
          </li>
          <li>
            Modalidad:{" "}
            <span className="font-medium">
              {modalidad === "mezcladas" ? "Selección inteligente" : modalidad}
            </span>
          </li>
        </ul>
      </Card>

      <Button
        onClick={iniciar}
        disabled={!canStart || starting}
        className="w-full h-14 text-base font-semibold"
      >
        {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar test"}
      </Button>

      <AlertDialog
        open={pendingLockedStage !== null}
        onOpenChange={(open) => !open && setPendingLockedStage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nivel aún no desbloqueado</AlertDialogTitle>
            <AlertDialogDescription>
              Puedes practicarlo en modo libre. El test quedará en tu historial, pero no contará
              para desbloquear fases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingLockedStage && stageProgress && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Para desbloquearlo normalmente:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {stageRequirements(stageProgress, pendingLockedStage).map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir en mi nivel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLockedStage) {
                  setSelectedStage(pendingLockedStage);
                  setStageFreeMode(true);
                }
                setPendingLockedStage(null);
              }}
            >
              Entrar en modo libre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
