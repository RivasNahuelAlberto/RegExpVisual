import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';

function TreeNode({ node, activeKey, expandedNodes, onToggle, onSelectState, depth = 0 }) {
  const isExpanded = expandedNodes.has(node.id);
  const isActive = activeKey === node.stateKey;

  const handleSelect = () => {
    if (node.state && typeof node.state.i === 'number' && typeof node.state.j === 'number') {
      onSelectState?.(node.state);
    }
  };

  return (
    <li className={`tree-node ${isActive ? 'active' : ''}`} style={{ marginLeft: `${depth * 0.6}rem` }}>
      <div className="tree-node-label" onClick={handleSelect}>
        <button type="button" className="tree-toggle" onClick={(event) => { event.stopPropagation(); onToggle(node.id); }}>
          {node.children?.length ? (isExpanded ? '▾' : '▸') : '•'}
        </button>
        <span className="event-badge">{node.stateKey}</span>
        <span>state ({node.state?.i}, {node.state?.j})</span>
        <span className="tree-result">&rarr; {String(node.result)}</span>
        {node.memoHit ? <span className="node-tag memo-hit">MEMO HIT</span> : null}
        {!node.memoHit && node.critical ? <span className="node-tag critical-path">CRITICAL</span> : null}
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
              onSelectState={onSelectState}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function TreeView({ events, callTree, activeStateKey, onSelectState, graphTitle = 'call-graph' }) {
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [showGraph, setShowGraph] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const graphRef = useRef(null);

  useEffect(() => {
    setExpandedNodes((current) => {
      const next = new Set(current);
      (callTree ?? []).forEach((node) => next.add(node.id));
      return next;
    });
  }, [callTree]);

  const calls = useMemo(() => events.filter((event) => event.type === 'CALL'), [events]);

  const exportSize = useMemo(() => {
    if (!graphLayout.nodes.length) {
      return { width: 1800, height: 1200 };
    }

    const padding = 220;
    const maxX = Math.max(...graphLayout.nodes.map((node) => (node.position?.x ?? 0) + (node.width ?? 260)));
    const maxY = Math.max(...graphLayout.nodes.map((node) => (node.position?.y ?? 0) + (node.height ?? 144)));

    return {
      width: Math.max(1800, Math.ceil(maxX + padding)),
      height: Math.max(1200, Math.ceil(maxY + padding)),
    };
  }, [graphLayout.nodes]);

  const handleExportGraph = async () => {
    if (!graphLayout.nodes.length) {
      return;
    }

    try {
      setIsExporting(true);

      const exportNode = document.createElement('div');
      exportNode.className = 'tree-export-surface';
      exportNode.style.position = 'fixed';
      exportNode.style.left = '-9999px';
      exportNode.style.top = '0';
      exportNode.style.width = `${exportSize.width}px`;
      exportNode.style.height = `${exportSize.height}px`;
      exportNode.style.padding = '40px';
      exportNode.style.background = '#ffffff';
      exportNode.style.fontFamily = 'Inter, Arial, sans-serif';
      exportNode.style.overflow = 'visible';
      exportNode.style.boxSizing = 'border-box';

      const title = document.createElement('div');
      title.textContent = graphTitle.replace(/-/g, ' ').toUpperCase();
      title.style.fontSize = '24px';
      title.style.fontWeight = '700';
      title.style.marginBottom = '24px';
      title.style.color = '#0f172a';
      exportNode.appendChild(title);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', `${exportSize.width}`);
      svg.setAttribute('height', `${exportSize.height - 100}`);
      svg.setAttribute('viewBox', `0 0 ${exportSize.width} ${exportSize.height - 100}`);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const edgesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      graphLayout.edges.forEach((edge) => {
        const source = graphLayout.nodes.find((node) => node.id === edge.source);
        const target = graphLayout.nodes.find((node) => node.id === edge.target);
        if (!source || !target) {
          return;
        }

        const sourceX = (source.position?.x ?? 0) + (source.width ?? 260) / 2;
        const sourceY = (source.position?.y ?? 0) + (source.height ?? 144) / 2;
        const targetX = (target.position?.x ?? 0) + (target.width ?? 260) / 2;
        const targetY = (target.position?.y ?? 0) + (target.height ?? 144) / 2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(sourceX));
        line.setAttribute('y1', String(sourceY));
        line.setAttribute('x2', String(targetX));
        line.setAttribute('y2', String(targetY));
        line.setAttribute('stroke', edge.style?.stroke ?? '#94a3b8');
        line.setAttribute('stroke-width', String(edge.style?.strokeWidth ?? 1));
        line.setAttribute('stroke-linecap', 'round');
        if (edge.style?.strokeDasharray) {
          line.setAttribute('stroke-dasharray', edge.style.strokeDasharray);
        }
        edgesLayer.appendChild(line);
      });
      svg.appendChild(edgesLayer);

      const nodesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      graphLayout.nodes.forEach((node) => {
        const nodeWidth = node.width ?? 260;
        const nodeHeight = node.height ?? 144;
        const x = node.position?.x ?? 0;
        const y = node.position?.y ?? 0;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(nodeWidth));
        rect.setAttribute('height', String(nodeHeight));
        rect.setAttribute('rx', '12');
        rect.setAttribute('fill', node.style?.background ?? '#0f172a');
        rect.setAttribute('stroke', node.style?.borderColor ?? '#ffffff');
        rect.setAttribute('stroke-width', '2');
        nodesLayer.appendChild(rect);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x + 16));
        text.setAttribute('y', String(y + 28));
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-size', '13');
        text.setAttribute('font-weight', '600');
        text.textContent = node.data?.label ?? node.id;
        nodesLayer.appendChild(text);
      });
      svg.appendChild(nodesLayer);
      exportNode.appendChild(svg);

      document.body.appendChild(exportNode);
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

      const dataUrl = await toPng(exportNode, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: exportSize.width,
        height: exportSize.height,
        style: {
          width: `${exportSize.width}px`,
          height: `${exportSize.height}px`,
          overflow: 'visible',
        },
      });

      const link = document.createElement('a');
      link.download = `${graphTitle}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export graph image', error);
    } finally {
      setIsExporting(false);
      document.querySelectorAll('.tree-export-surface').forEach((element) => element.remove());
    }
  };

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

  const activePath = useMemo(() => {
    const path = new Set();
    if (!activeStateKey) return path;

    const findPath = (nodes) => {
      for (const node of nodes) {
        if (node.stateKey === activeStateKey) {
          path.add(node.id);
          return true;
        }
        if (node.children?.length && findPath(node.children)) {
          path.add(node.id);
          return true;
        }
      }
      return false;
    };

    findPath(callTree ?? []);
    return path;
  }, [callTree, activeStateKey]);

  const elk = useMemo(() => new ELK(), []);
  const [graphLayout, setGraphLayout] = useState({ nodes: [], edges: [] });

  const rawGraph = useMemo(() => {
    const nodes = [];
    const edges = [];

    const walk = (node, parentKey = null) => {
      const branchDecision = (node.children?.length ?? 0) > 1;
      nodes.push({
        id: node.id,
        data: {
          label: `${node.stateKey} → ${String(node.result)}${node.memoHit ? ' [memo]' : ''}${node.critical ? ' [critical]' : ''}`,
          state: node.state,
          stateKey: node.stateKey,
          memoHit: node.memoHit,
          critical: node.critical,
          branchDecision,
        },
        memoHit: node.memoHit,
        critical: node.critical,
        branchDecision,
      });

      if (parentKey) {
        edges.push({ id: `${parentKey}-${node.id}`, source: parentKey, target: node.id });
      }

      (node.children ?? []).forEach((child) => walk(child, node.id));
    };

    (callTree ?? []).forEach((node) => walk(node));
    return { nodes, edges };
  }, [callTree]);

  const hoverInfo = useMemo(() => {
    if (!hoveredNode?.id) {
      return null;
    }

    const nodesById = new Map(rawGraph.nodes.map((node) => [node.id, node]));
    const node = nodesById.get(hoveredNode.id);
    if (!node) {
      return null;
    }

    const children = rawGraph.edges
      .filter((edge) => edge.source === hoveredNode.id)
      .map((edge) => nodesById.get(edge.target))
      .filter(Boolean);

    const findPath = (nodes, targetId, stack = []) => {
      for (const current of nodes) {
        const nextStack = [...stack, current.stateKey];
        if (current.id === targetId) {
          return nextStack;
        }
        const childPath = findPath(current.children ?? [], targetId, nextStack);
        if (childPath) {
          return childPath;
        }
      }
      return null;
    };

    const path = findPath(callTree ?? [], hoveredNode.id) ?? [];
    return { node, children, path };
  }, [hoveredNode, rawGraph, callTree]);

  const getTooltipStyle = () => ({
    left: `${tooltipPos.x + 16}px`,
    top: `${tooltipPos.y + 16}px`,
  });

  useEffect(() => {
    if (!rawGraph.nodes.length) {
      setGraphLayout({ nodes: [], edges: [] });
      return;
    }

    const activeEdges = new Set(rawGraph.edges
      .filter((edge) => activePath.has(edge.source) && activePath.has(edge.target))
      .map((edge) => edge.id));

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
        width: 260,
        height: 144,
      })),
      edges: rawGraph.edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    elk.layout(elkGraph).then((layouted) => {
      const nodeById = new Map(rawGraph.nodes.map((node) => [node.id, node]));
      const nodes = (layouted.children ?? []).map((child) => {
        const nodeMeta = nodeById.get(child.id);
        const isActive = activeStateKey === nodeMeta?.data?.stateKey;
        const isPath = activePath.has(child.id);
        const label = nodeMeta?.data?.label ?? child.id;
        const background = isPath
          ? '#7c3aed'
          : nodeMeta?.critical
            ? '#065f46'
            : nodeMeta?.memoHit
              ? '#f97316'
              : nodeMeta?.branchDecision
                ? '#0ea5e9'
                : '#1e293b';

        return {
          id: child.id,
          position: { x: child.x ?? 0, y: child.y ?? 0 },
          data: {
            ...nodeMeta?.data,
            label,
          },
          title: label,
          style: {
            background,
            color: 'white',
            border: isActive ? '3px solid #60a5fa' : '1px solid rgba(148, 163, 184, 0.3)',
            boxShadow: isPath ? '0 0 0 4px rgba(124, 58, 237, 0.2)' : undefined,
          },
          sourcePosition: 'bottom',
          targetPosition: 'top',
          width: child.width,
          height: child.height,
        };
      });

      const edges = rawGraph.edges.map((edge) => ({
        ...edge,
        style: {
          stroke: activeEdges.has(edge.id) ? '#a855f7' : '#94a3b8',
          strokeWidth: activeEdges.has(edge.id) ? 3 : 1,
          strokeDasharray: rawGraph.nodes.find((node) => node.id === edge.source)?.branchDecision ? '5 5' : undefined,
        },
      }));

      setGraphLayout({ nodes, edges });
    }).catch(() => {
      setGraphLayout({ nodes: rawGraph.nodes.map((node) => ({
        ...node,
        position: { x: 0, y: 0 },
        sourcePosition: 'bottom',
        targetPosition: 'top',
      })), edges: rawGraph.edges });
    });
  }, [elk, rawGraph, activePath, activeStateKey]);

  return (
    <div className="tree-view">
      <div className="toolbar-row">
        <h3>Call tree</h3>
        <button type="button" className="tree-open-button" onClick={() => setShowGraph(true)}>
          Open graph
        </button>
      </div>
      <div className="tree-legend">
        <div className="legend-item">
          <span className="legend-swatch memo-hit" /> Memo hit
        </div>
        <div className="legend-item">
          <span className="legend-swatch critical-path" /> Critical path
        </div>
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
              onSelectState={onSelectState}
            />
          ))}
        </ul>
      </div>
      {showGraph ? (
        <div className="tree-modal-backdrop" onClick={() => setShowGraph(false)}>
          <div className="tree-modal" onClick={(event) => event.stopPropagation()}>
            <div className="toolbar-row">
              <div>
                <h3>Call graph</h3>
                <div className="tree-legend tree-legend-modal">
                  <div className="legend-item">
                    <span className="legend-swatch memo-hit" /> Memo hit
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch critical-path" /> Critical path
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch branch-decision" /> Branch decision
                  </div>
                  <div className="legend-item" style={{ fontStyle: 'italic', opacity: 0.85 }}>
                    Hover a node to inspect its state
                  </div>
                </div>
              </div>
              <button type="button" onClick={handleExportGraph} disabled={isExporting}>
                {isExporting ? 'Exporting…' : 'Export PNG'}
              </button>
              <button type="button" onClick={() => setShowGraph(false)}>Close</button>
            </div>
            <div className="tree-graph-shell" ref={graphRef}>
              <ReactFlow
                nodes={graphLayout.nodes}
                edges={graphLayout.edges}
                fitView
                onNodeClick={(_event, node) => {
                  setHoveredNode(node);
                  onSelectState?.(node.data.state);
                }}
                onNodeMouseEnter={(event, node) => {
                  setHoveredNode(node);
                  setTooltipPos({ x: event.clientX, y: event.clientY });
                }}
                onNodeMouseMove={(event) => setTooltipPos({ x: event.clientX, y: event.clientY })}
                onNodeMouseLeave={() => setHoveredNode(null)}
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
              {hoverInfo ? (
                <div className="hover-tooltip" style={getTooltipStyle()}>
                  <h4>Hovered node</h4>
                  <p><strong>State:</strong> ({hoverInfo.node.data.state?.i}, {hoverInfo.node.data.state?.j})</p>
                  <p><strong>Result:</strong> {hoverInfo.node.data.label.split('→').pop().trim()}</p>
                  <p><strong>Memo hit:</strong> {hoverInfo.node.data.memoHit ? 'yes' : 'no'}</p>
                  <p><strong>Critical path:</strong> {hoverInfo.node.data.critical ? 'yes' : 'no'}</p>
                  <p><strong>Branch decision:</strong> {hoverInfo.node.data.branchDecision ? 'yes' : 'no'}</p>
                  <p><strong>Children:</strong> {hoverInfo.children.length ? hoverInfo.children.map((child) => child.id).join(', ') : 'none'}</p>
                  <p><strong>Path to root:</strong> {hoverInfo.path.join(' → ') || 'none'}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
