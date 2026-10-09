import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import ConceptNode from './ConceptNode';
import { GitBranch, Layers, ShieldCheck, Flame } from 'lucide-react';

const nodeTypes = {
  conceptNode: ConceptNode,
};

export default function KnowledgeGraph({ graphData, onSelectNode, selectedNodeId }) {
  const { nodes: initialNodes = [], edges: initialEdges = [], engine = 'NetworkX Embedded' } =
    graphData || {};

  // Augment edges with arrow markers and styling
  const formattedEdges = useMemo(() => {
    return initialEdges.map((e) => ({
      ...e,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: e.style?.stroke || '#64748b',
      },
      style: {
        ...e.style,
        strokeWidth: e.animated ? 3.5 : 2,
      },
    }));
  }, [initialEdges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(formattedEdges);

  // Keep internal state in sync with updated graph data
  React.useEffect(() => {
    // Handled via props
  }, [initialNodes, formattedEdges]);

  const handleNodeClick = (_, node) => {
    if (onSelectNode) {
      onSelectNode({ ...node.data, id: node.id || node.data?.concept_id || node.data?.id });
    }
  };


  return (
    <div className="relative w-full h-[520px] rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Top Overlay Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold text-slate-200">
          <GitBranch className="w-4 h-4 text-teal-400" />
          <span>Living Knowledge Graph</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="text-[11px] font-mono text-slate-400">{engine}</span>
        </div>
      </div>

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={initialNodes.map((n) => ({
          ...n,
          selected: n.id === selectedNodeId,
        }))}
        edges={formattedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1.5} />
        <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300 [&>button]:!border-slate-800" />
        <MiniMap
          nodeStrokeColor="#0f172a"
          nodeColor={(n) => {
            const stab = n.data?.stability;
            if (stab === 'Strong') return '#22c55e';
            if (stab === 'Stable') return '#3b82f6';
            if (stab === 'Weakening') return '#f59e0b';
            return '#ef4444';
          }}
          className="!bg-slate-950/90 !border-slate-800 rounded-xl"
        />
      </ReactFlow>

      {/* Bottom Legend Overlay */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs backdrop-blur-md shadow-lg">
        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 mr-1">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-300 text-[11px]">Strong (&ge;85%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-slate-300 text-[11px]">Stable (70-84%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-slate-300 text-[11px]">Weakening (50-69%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-slate-300 text-[11px]">At Risk (&lt;50%)</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800 text-rose-400 font-bold">
          <Flame className="w-3.5 h-3.5" />
          <span className="text-[11px]">Prerequisite Bottleneck</span>
        </div>
      </div>
    </div>
  );
}
