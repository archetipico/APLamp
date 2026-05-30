import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Repl, type ReplHandle } from "./Repl";
import { AplKeyboard } from "./AplKeyboard";
import { GlyphPanel, type GlyphPanelHandle } from "./GlyphPanel";
import { ExercisesPanel, type ExercisesPanelHandle } from "./ExercisesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConsoleBand } from "@/components/ConsoleBand";

export function Workbench() {
  const { t } = useTranslation();
  const replRef = useRef<ReplHandle>(null);
  const glyphPanelRef = useRef<GlyphPanelHandle>(null);
  const exercisesPanelRef = useRef<ExercisesPanelHandle>(null);
  const [tab, setTab] = useState("glyphs");

  const insert = (s: string) => replRef.current?.insertAtCursor(s);
  const send = (s: string) => replRef.current?.setInput(s);

  const onTabChange = (value: string) => {
    setTab(value);
    requestAnimationFrame(() => {
      if (value === "glyphs") glyphPanelRef.current?.resetScroll();
      else if (value === "exercises") exercisesPanelRef.current?.resetScroll();
    });
  };

  return (
    <div className="container py-3 lg:py-4 lg:h-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-4 lg:gap-5 lg:h-full lg:min-h-0">
        {/* Left: REPL + keyboard */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <Repl
            ref={replRef}
            className="min-h-[42svh] lg:min-h-0 lg:flex-1"
          />
          <AplKeyboard onInsert={insert} />
        </div>

        {/* Right: tabs */}
        <aside
          className="chassis flex flex-col bg-card border border-foreground/85 min-h-[70svh] lg:min-h-0"
        >
          <ConsoleBand
            label={t(
              tab === "glyphs"
                ? "workbench.bandReference"
                : "workbench.bandExercises"
            )}
          />
          <Tabs
            value={tab}
            onValueChange={onTabChange}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-4 sm:px-5 pt-3 pb-3 border-b border-foreground/85">
              <TabsList>
                <TabsTrigger value="glyphs" className="py-2">
                  {t("workbench.panelGlyphs")}
                </TabsTrigger>
                <TabsTrigger value="exercises" className="py-2">
                  {t("workbench.panelExercises")}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="glyphs"
              className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden"
            >
              <GlyphPanel
                ref={glyphPanelRef}
                onSendToRepl={send}
                className="h-full"
              />
            </TabsContent>
            <TabsContent
              value="exercises"
              className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden"
            >
              <ExercisesPanel
                ref={exercisesPanelRef}
                onSendToRepl={send}
                className="h-full"
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
