import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import 'reactflow/dist/style.css';

function TreeNode({ node, activeKey, expandedNodes, onToggle, depth = 0 }) {
  const isExpanded = expandedNodes.has(node.key);
  const isActive = activeKey === node.key;

  return (
    <li className={`tree-node ${isActive ? 'active' : ''}`} style={{ marginLeft: `${depth * 0.6}rem` }}>
      <div className="tree-node-label">
        <button type="button" className="tree-toggle" onClick={() => onToggle(node.key)}>
          {node.children?.length ? (isExpanded ? '▾' : '▸') : '•'}
        </button>
        <span className="event-badge">{node.key}</span>
        <span>state ({node.state?.i}, {node.state?.j})</span>
        <span className="tree-result">&rarr; {String(node.result)}</span>
      </div>
      {node.children?.length && isExpanded ? (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              activeKey={activeKey}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function TreeView({ events, callTree, activeStateKey }) {
  const [expandedNodes, setExpandedNodes] = useState(() => new Set(['0,0']));
  const [showGraph, setShowGraph] = useState(false);

  const calls = useMemo(() => events.filter((event) => event.type === 'CALL'), [events]);

  const toggleNode = (key) => {
    setExpandedNodes((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const elk = useMemo(() => new ELK(), []);
  const [graphLayout, setGraphLayout] = useState({ nodes: [], edges: [] });

  const rawGraph = useMemo(() => {
    const nodes = [];
    const edges = [];

    const walk = (node, parentKey = null) => {
      nodes.push({
        id: node.key,
        data: { label: `${node.key} → ${String(node.result)}` },
      });

      if (parentKey) {
        edges.push({ id: `${parentKey}-${node.key}`, source: parentKey, target: node.key });
      }

      (node.children ?? []).forEach((child) => walk(child, node.key));
    };

    (callTree ?? []).forEach((node) => walk(node));
    return { nodes, edges };
  }, [callTree]);

  useEffect(() => {
    if (!rawGraph.nodes.length) {
      setGraphLayout({ nodes: [], edges: [] });
      return;
    }

    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.layered.spacing.nodeNodeBetweenLayers': '40',
        'elk.layered.spacing.nodeNode': '30',
        'elk.spacing.nodeNode': '20',
      },
      children: rawGraph.nodes.map((node) => ({
        id: node.id,
        width: 180,
        height: 72,
      })),
      edges: rawGraph.edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    elk.layout(elkGraph).then((layouted) => {
      const labelById = new Map(rawGraph.nodes.map((node) => [node.id, node.data.label]));
      const nodes = (layouted.children ?? []).map((child) => ({
        id: child.id,
        position: { x: child.x ?? 0, y: child.y ?? 0 },
        data: { label: labelById.get(child.id) ?? child.id },
        style: rawGraph.nodes.find((n) => n.id === child.id) && activeStateKey === child.id
          ? { background: '#2563eb', color: 'white' }
          : undefined,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        width: child.width,
        height: child.height,
      }));

      setGraphLayout({ nodes, edges: rawGraph.edges });
    }).catch(() => {
      setGraphLayout({ nodes: rawGraph.nodes.map((node) => ({
        ...node,
        position: { x: 0, y: 0 },
        sourcePosition: 'bottom',
        targetPosition: 'top',
      })), edges: rawGraph.edges });
    });
  }, [elk, rawGraph, activeStateKey]);

  return (
    <div className="tree-view">
      <div className="toolbar-row">
        <h3>Call tree</h3>
        <button type="button" className="tree-open-button" onClick={() => setShowGraph(true)}>
          Open graph
        </button>
      </div>
      <p className="step-indicator">{calls.length} recursive calls</p>
      <div className="tree-list-shell">
        <ul className="tree-root">
          {(callTree?.length ? callTree : []).map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              activeKey={activeStateKey}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
            />
          ))}
        </ul>
      </div>
      {showGraph ? (
        <div className="tree-modal-backdrop" onClick={() => setShowGraph(false)}>
          <div className="tree-modal" onClick={(event) => event.stopPropagation()}>
            <div className="toolbar-row">
              <h3>Call graph</h3>
              <button type="button" onClick={() => setShowGraph(false)}>Close</button>
            </div>
            <div className="tree-graph-shell">
              <ReactFlow nodes={graphLayout.nodes} edges={graphLayout.edges} fitView>
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
