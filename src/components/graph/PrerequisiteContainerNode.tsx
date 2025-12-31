import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type PrerequisiteContainerData = {
  options: Array<{
    type: "single" | "group";
    courses: string[];
    gradeRequirement?: string;
    label?: string;
  }>;
};

export const PrerequisiteContainerNode = memo(({ data, selected }: NodeProps<PrerequisiteContainerData>) => {
  return (
    <div
      className={cn(
        "px-6 py-4 rounded-xl border-2 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
        "border-blue-300 dark:border-blue-700",
        selected && "ring-2 ring-blue-500 ring-offset-2",
        "min-w-[280px]"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !h-3 !w-3" />
      
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
            Choose 1 option:
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {data.options.map((option, index) => (
            <div
              key={index}
              className={cn(
                "px-3 py-2 rounded-lg border",
                "bg-white/60 dark:bg-gray-900/40",
                "border-blue-200 dark:border-blue-800"
              )}
            >
              {option.type === "single" ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {option.courses[0]}
                    </span>
                    {option.gradeRequirement && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                        {option.gradeRequirement}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    {option.gradeRequirement && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                        {option.gradeRequirement}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">in one of:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {option.courses.map((code, codeIndex) => (
                      <span
                        key={codeIndex}
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !h-3 !w-3" />
    </div>
  );
});

PrerequisiteContainerNode.displayName = "PrerequisiteContainerNode";

