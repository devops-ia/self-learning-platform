"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/AuthProvider";

interface ExerciseItem {
  id: string;
  title: string;
  prerequisites: string[];
  difficulty?: string;
}

interface ExerciseGraphProps {
  module: string;
  exercises: ExerciseItem[];
  showDifficulty?: boolean;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  completed: { bg: "#064e3b", border: "#10b981", text: "#6ee7b7" },
  available: { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd" },
  locked: { bg: "#374151", border: "#6b7280", text: "#9ca3af" },
};

const difficultyIndicators: Record<string, string> = {
  easy: " [E]",
  medium: " [M]",
  hard: " [H]",
};

export default function ExerciseGraph({
  module,
  exercises,
  showDifficulty,
}: ExerciseGraphProps) {
  const { t } = useT();
  const { user } = useAuth();
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    function defaultStatuses(): Record<string, string> {
      const map: Record<string, string> = {};
      exercises.forEach((ex) => {
        map[ex.id] = ex.prerequisites.length === 0 ? "available" : "locked";
      });
      return map;
    }

    if (!user?.id) {
      setStatuses(defaultStatuses());
      return;
    }

    fetch(`/api/progress?module=${module}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.progress && Object.keys(data.progress).length > 0) {
          setStatuses(data.progress);
        } else {
          setStatuses(defaultStatuses());
        }
      })
      .catch(() => {
        setStatuses(defaultStatuses());
      });
  }, [module, exercises, user]);

  // Build nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const COLS = 3;
    const NODE_W = 200;
    const NODE_H = 60;
    const GAP_X = 60;
    const GAP_Y = 80;

    // Group exercises by "row" based on prerequisite depth
    const depthMap = new Map<string, number>();
    function getDepth(id: string, visited = new Set<string>()): number {
      if (depthMap.has(id)) return depthMap.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);
      const ex = exercises.find((e) => e.id === id);
      if (!ex || ex.prerequisites.length === 0) {
        depthMap.set(id, 0);
        return 0;
      }
      const maxPrereqDepth = Math.max(
        ...ex.prerequisites.map((p) => getDepth(p, visited))
      );
      const depth = maxPrereqDepth + 1;
      depthMap.set(id, depth);
      return depth;
    }
    exercises.forEach((ex) => getDepth(ex.id));

    // Group by depth
    const byDepth = new Map<number, typeof exercises>();
    exercises.forEach((ex) => {
      const d = depthMap.get(ex.id) || 0;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(ex);
    });

    // If there are no prerequisites (all depth 0), lay them out in a grid
    const allSameDepth = byDepth.size === 1;

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (allSameDepth) {
      // Grid layout
      exercises.forEach((ex, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const status = statuses[ex.id] || "available";
        const colors = statusColors[status] || statusColors.locked;
        const suffix = showDifficulty && ex.difficulty ? difficultyIndicators[ex.difficulty] || "" : "";

        nodes.push({
          id: ex.id,
          position: { x: col * (NODE_W + GAP_X), y: row * (NODE_H + GAP_Y) },
          data: { label: ex.title + suffix },
          style: {
            background: colors.bg,
            border: `2px solid ${colors.border}`,
            color: colors.text,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 500,
            width: NODE_W,
            cursor: status !== "locked" ? "pointer" : "default",
            opacity: status === "locked" ? 0.5 : 1,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    } else {
      // Hierarchical layout by depth
      const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);
      sortedDepths.forEach((depth) => {
        const row = byDepth.get(depth)!;
        const totalWidth = row.length * NODE_W + (row.length - 1) * GAP_X;
        const startX = -totalWidth / 2 + NODE_W / 2;

        row.forEach((ex, colIdx) => {
          const status = statuses[ex.id] || (ex.prerequisites.length === 0 ? "available" : "locked");
          const colors = statusColors[status] || statusColors.locked;
          const suffix = showDifficulty && ex.difficulty ? difficultyIndicators[ex.difficulty] || "" : "";

          nodes.push({
            id: ex.id,
            position: { x: startX + colIdx * (NODE_W + GAP_X), y: depth * (NODE_H + GAP_Y) },
            data: { label: ex.title + suffix },
            style: {
              background: colors.bg,
              border: `2px solid ${colors.border}`,
              color: colors.text,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 500,
              width: NODE_W,
              cursor: status !== "locked" ? "pointer" : "default",
              opacity: status === "locked" ? 0.5 : 1,
            },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          });

          ex.prerequisites.forEach((prereqId) => {
            edges.push({
              id: `${prereqId}-${ex.id}`,
              source: prereqId,
              target: ex.id,
              animated: statuses[prereqId] === "completed",
              style: { stroke: statuses[prereqId] === "completed" ? "#10b981" : "#6b7280" },
            });
          });
        });
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [exercises, statuses, showDifficulty]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initialNodes change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const status = statuses[node.id];
      if (status === "available" || status === "completed") {
        router.push(`/modules/${module}/${node.id}`);
      }
    },
    [statuses, module, router]
  );

  return (
    <div className="h-[500px] border border-[var(--border)] rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={20} />
        <Controls
          showInteractive={false}
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        />
      </ReactFlow>
      <div className="flex gap-4 p-3 text-xs text-[var(--muted)] border-t border-[var(--border)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#10b981]" />
          {t.progress.completed}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
          {t.progress.available}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#6b7280]" />
          {t.progress.locked}
        </span>
      </div>
    </div>
  );
}
