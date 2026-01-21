import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { supabase } from "../lib/supabase";

const steps = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Course Content" },
  { id: 3, label: "Review & Publish" },
];

export function CourseBuilderPage() {
  const [message, setMessage] = useState("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const isBasicsComplete =
    courseTitle.trim().length > 0 && courseDescription.trim().length > 0;

  const handleSaveDraft = async () => {
    if (!isBasicsComplete) return;
    if (currentCourseId) {
      const { error } = await supabase
        .from("courses")
        .update({
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
        })
        .eq("id", currentCourseId);
      if (error) {
        setMessage("Unable to update course.");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
          is_published: false,
        })
        .select("id")
        .single();
      if (error) {
        setMessage("Unable to create course.");
        return;
      }
      setCurrentCourseId(data?.id ?? null);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {courseTitle.trim() ? courseTitle.trim() : "Untitled course"}
        </h1>
        {message ? <p className="mt-3 text-xs text-red-600">{message}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
        <div className="flex items-center justify-between">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            const isEnabled =
              step.id === 1 || (step.id === 2 && isBasicsComplete);
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isEnabled}
                onClick={() => setActiveStep(step.id as 1 | 2 | 3)}
                className="flex w-full flex-col items-center gap-2 text-center"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : isEnabled
                      ? "border border-slate-300 text-slate-600"
                      : "border border-slate-200 text-slate-300"
                  }`}
                >
                  {step.id}
                </span>
                <div className="text-xs font-semibold text-slate-700">
                  {step.label}
                </div>
                <div className="text-[11px] text-slate-400">
                  {step.id === 1
                    ? "Course information"
                    : step.id === 2
                    ? "Modules, lessons & tests"
                    : "Launch course"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-900">
              Course title
            </label>
            <Input
              value={courseTitle}
              onChange={(event) => setCourseTitle(event.target.value)}
              placeholder="Untitled course"
              className="text-lg font-semibold placeholder:font-normal"
            />
          </div>

          {activeStep === 1 ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-base font-semibold text-slate-900">
                  Course description
                </label>
                <Input
                  value={courseDescription}
                  onChange={(event) => setCourseDescription(event.target.value)}
                  placeholder="Describe the outcomes for this course"
                  className="h-14"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-slate-900">
                  Course thumbnail
                </label>
                <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                  Drag & drop a thumbnail or click to upload
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Complete the basics to unlock course content.
                </p>
                <Button
                  onClick={async () => {
                    await handleSaveDraft();
                    setActiveStep(2);
                  }}
                  disabled={!isBasicsComplete}
                >
                  Continue to Course Content
                </Button>
              </div>
            </div>
          ) : null}

          {activeStep === 2 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Course Content setup will appear here next.
            </div>
          ) : null}

          {activeStep === 3 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Review & Publish will be available in a future step.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
