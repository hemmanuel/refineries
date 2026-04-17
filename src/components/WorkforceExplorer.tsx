import { useState, useCallback } from 'react';
import Tree from 'react-d3-tree';
import blsHierarchy from '../data/bls_hierarchy.json';

const renderCustomNodeElement = ({ nodeDatum, toggleNode }: any) => {
  const isLeaf = !nodeDatum.children || nodeDatum.children.length === 0;
  const isExpanded = nodeDatum.__rd3t.expanded;
  
  return (
    <g onClick={toggleNode} className="cursor-pointer">
      <circle 
        r="8" 
        fill={isLeaf ? "#9ca3af" : (isExpanded ? "#3b82f6" : "#60a5fa")} 
        stroke={isLeaf ? "#6b7280" : "#2563eb"}
        strokeWidth="2"
      />
      <text fill="#111827" strokeWidth="0" x="15" y="-5" fontSize="14" fontWeight={isLeaf ? "normal" : "bold"}>
        {nodeDatum.name}
      </text>
      <text fill="#4b5563" strokeWidth="0" x="15" y="12" fontSize="12">
        {nodeDatum.attributes?.employees ? nodeDatum.attributes.employees.toLocaleString() : 'N/A'} employees
        {nodeDatum.attributes?.group ? ` (${nodeDatum.attributes.group})` : ''}
      </text>
    </g>
  );
};

export default function WorkforceExplorer() {
  const [translate, setTranslate] = useState({ x: 200, y: 300 });

  const containerRef = useCallback((containerElem: HTMLDivElement | null) => {
    if (containerElem !== null) {
      const { width, height } = containerElem.getBoundingClientRect();
      setTranslate({ x: width / 5, y: height / 2 });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-6">
      <div className="bg-white shadow px-6 py-4 rounded-lg mb-4">
        <h1 className="text-2xl font-bold text-gray-900">BLS Workforce Hierarchy Explorer</h1>
        <p className="text-gray-600 mt-1">
          Interactive visualization of the Bureau of Labor Statistics Occupational Employment and Wage Statistics (OEWS) for NAICS 324100 (Petroleum and Coal Products Manufacturing).
          Click on nodes to expand or collapse categories.
        </p>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-grow w-full bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
      >
        <Tree
          data={blsHierarchy}
          translate={translate}
          nodeSize={{ x: 350, y: 60 }}
          renderCustomNodeElement={renderCustomNodeElement}
          orientation="horizontal"
          pathFunc="step"
          separation={{ siblings: 1, nonSiblings: 1.5 }}
          initialDepth={1}
        />
      </div>
    </div>
  );
}
