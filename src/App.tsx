import { Header } from "@/components/Header";
import { Workbench } from "@/components/Workbench";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuardianGate } from "@/components/GuardianGate";

export default function App() {
  return (
    <GuardianGate>
      <TooltipProvider delayDuration={150}>
        <div className="min-h-[100svh] lg:h-screen flex flex-col lg:overflow-hidden relative">
          <span aria-hidden className="page-mark">⍝</span>
          <Header />
          <main className="flex-1 lg:min-h-0 relative z-[2]">
            <Workbench />
          </main>
        </div>
      </TooltipProvider>
    </GuardianGate>
  );
}
