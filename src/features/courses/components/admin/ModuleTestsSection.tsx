import { BadgeCheck, Plus } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type { CourseTest } from "./courseBuilderUiTypes";

type ModuleTestsSectionProps = {
  moduleId: string;
  tests: CourseTest[];
  onOpenCreateTest: (moduleId: string) => void;
};

export function ModuleTestsSection({
  moduleId,
  tests,
  onOpenCreateTest,
}: ModuleTestsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">Tests & Quizzes</h3>
        </div>
        <Button variant="secondary" onClick={() => onOpenCreateTest(moduleId)}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Test
          </span>
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10">
        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <BadgeCheck className="h-10 w-10 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">No tests in this module yet</p>
            <Button variant="secondary" onClick={() => onOpenCreateTest(moduleId)}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Test
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tests.map((test) => (
              <div key={test.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{test.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {test.questions.length} question{test.questions.length === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
