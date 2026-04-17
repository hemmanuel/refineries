import { useMemo, useState, useCallback, useEffect } from 'react';
  import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    Handle,
    Position,
    type Node,
    type Edge,
    type NodeMouseHandler,
    useNodesState,
    useEdgesState,
  } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import blsHierarchy from '../data/bls_hierarchy.json';
import { ChevronRight, ChevronDown } from 'lucide-react';

// --- Custom Node Component ---
const CustomNode = ({ data }: any) => {
  const isLeaf = data.isLeaf;
  const isRoot = data.isRoot;
  const isExpanded = data.isExpanded;
  
  return (
    <div 
      className={`px-4 py-3 shadow-md rounded-lg border-2 w-[320px] transition-colors ${
        isLeaf ? 'bg-gray-50 border-gray-300' : 'bg-white border-blue-400 hover:border-blue-500 cursor-pointer'
      }`}
    >
      {!isRoot && <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500" />}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="font-bold text-sm text-gray-900 leading-tight mb-1">
            {data.label}
          </div>
          <div className="text-xs text-gray-500">
            {data.attributes?.employees ? data.attributes.employees.toLocaleString() : 'N/A'} employees
            {data.attributes?.group ? ` (${data.attributes.group})` : ''}
          </div>
        </div>
        {!isLeaf && (
          <div className="mt-0.5 text-blue-500 flex-shrink-0">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        )}
      </div>
      {!isLeaf && <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500" />}
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

// --- Layout Calculation ---
const nodeWidth = 320;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 30 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Main Component ---
export default function WorkforceExplorer() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  // Track expanded state of nodes by ID
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'node_0': true // Root is expanded by default
  });

  // Build the full hierarchy once
  const fullHierarchy = useMemo(() => {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    let idCounter = 0;
    
    // Map to keep track of parent-child relationships
    const parentMap: Record<string, string[]> = {};

    function traverse(node: any, parentId: string | null = null, depth = 0) {
      const id = `node_${idCounter++}`;
      const isLeaf = !node.children || node.children.length === 0;
      
      if (parentId) {
        if (!parentMap[parentId]) parentMap[parentId] = [];
        parentMap[parentId].push(id);
      }

      allNodes.push({
        id,
        data: { 
          id,
          label: node.name, 
          attributes: node.attributes,
          isLeaf,
          isRoot: !parentId,
          depth
        },
        position: { x: 0, y: 0 },
        type: 'customNode',
      });

      if (parentId) {
        allEdges.push({
          id: `edge_${parentId}_${id}`,
          source: parentId,
          target: id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#9ca3af', strokeWidth: 2 },
        });
      }

      if (node.children) {
        node.children.forEach((child: any) => traverse(child, id, depth + 1));
      }
    }

    traverse(blsHierarchy);
    
    // Expand the first level by default
    const initialExpanded: Record<string, boolean> = { 'node_0': true };
    if (parentMap['node_0']) {
      parentMap['node_0'].forEach(childId => {
        initialExpanded[childId] = false; // Children of root are visible but not expanded
      });
    }
    
    return { allNodes, allEdges, parentMap, initialExpanded };
  }, []);

  // Initialize expanded state
  useEffect(() => {
    setExpandedNodes(fullHierarchy.initialExpanded);
  }, [fullHierarchy]);

  // Handle node toggle
  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (!node.data.isLeaf) {
      handleToggle(node.id);
    }
  }, [handleToggle]);

  // Compute visible nodes and edges based on expanded state
  useEffect(() => {
    const { allNodes, allEdges, parentMap } = fullHierarchy;
    
    // Determine which nodes are visible
    const visibleNodeIds = new Set<string>(['node_0']); // Root is always visible
    
    // Helper to recursively add visible children
    const addVisibleChildren = (parentId: string) => {
      if (expandedNodes[parentId] && parentMap[parentId]) {
        parentMap[parentId].forEach(childId => {
          visibleNodeIds.add(childId);
          addVisibleChildren(childId);
        });
      }
    };
    
    addVisibleChildren('node_0');
    
    // Filter nodes and edges
    const visibleNodes = allNodes
      .filter(n => visibleNodeIds.has(n.id))
      .map(n => ({
        ...n,
        data: {
          ...n.data,
          isExpanded: !!expandedNodes[n.id],
          onToggle: handleToggle
        }
      }));
      
    const visibleEdges = allEdges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );
    
    // Calculate layout for visible elements
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      visibleNodes,
      visibleEdges
    );
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [expandedNodes, fullHierarchy, setNodes, setEdges, handleToggle]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4">
      <div className="flex-grow w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ maxZoom: 0.75, padding: 0.2 }}
            minZoom={0.1}
            attributionPosition="bottom-right"
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background color="#e5e7eb" gap={16} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                return node.data?.isLeaf ? '#f3f4f6' : '#60a5fa';
              }} 
              maskColor="rgba(255, 255, 255, 0.6)"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
