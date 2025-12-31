import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type RequirementNodeData = {
  label: string;
  type: "OR" | "AND";
  gradeRequirement?: string;
  courses: string[];
};

export const RequirementNode = memo(({ data, selected }: NodeProps<RequirementNodeData>) => {
  // Only show requirement nodes for OR logic (Choose 1 path)
  if (data.type !== "OR") return null;

  return (
    <div
      className={cn(
        "px-5 py-3 rounded-xl border-2 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
        "border-blue-300 dark:border-blue-700",
        selected && "ring-2 ring-blue-500 ring-offset-2",
        "min-w-[140px] text-center"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !h-3 !w-3" />
      
      <div className="flex flex-col items-center gap-1">
        <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          Choose 1 path
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
          Any option below
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !h-3 !w-3" />
    </div>
  );
});

RequirementNode.displayName = "RequirementNode";

