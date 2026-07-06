import { Component, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import 'reactflow/dist/style.css';

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const wrapLabel = (value, maxChars = 24) => {
  const text = String(value ?? '');
  if (!text) {
    return [''];
  }

  const words = text.split(/(\s+)/).filter(Boolean);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current}${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current.trim());
    }
    current = word;
  });

  if (current) {
    lines.push(current.trim());
  }

  return lines.length ? lines : [text];
};

class TreeViewErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TreeView rendering failed', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="tree-view">
          <div className="tree-view-error">
            <h3>Graph rendering was interrupted</h3>
            <p>The call tree for this input is too large to render interactively in the browser. Try a smaller input or switch to a memoized run.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

function TreeViewContent({ events, callTree, activeStateKey, onSelectState, graphTitle = 'call-graph' }) {
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [showGraph, setShowGraph] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [graphLayout, setGraphLayout] = useState({ nodes: [], edges: [] });
  const graphRef = useRef(null);

  useEffect(() => {
    setExpandedNodes((current) => {
      const next = new Set(current);
      (callTree ?? []).forEach((node) => next.add(node.id));
      return next;
    });
  }, [callTree]);

  const calls = useMemo(() => events.filter((event) => event.type === 'CALL'), [events]);
  const MAX_VISIBLE_NODES = 400;
  const exceedsRenderBudget = (callTree?.length ?? 0) > MAX_VISIBLE_NODES;
  const visibleCallTree = useMemo(() => {
    if (!Array.isArray(callTree) || !callTree.length) {
      return [];
    }
    return exceedsRenderBudget ? callTree.slice(0, MAX_VISIBLE_NODES) : callTree;
  }, [callTree, exceedsRenderBudget]);

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

      const width = exportSize.width;
      const height = exportSize.height;
      const title = graphTitle.replace(/-/g, ' ').toUpperCase();
      const svgParts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`,
        `<text x="40" y="58" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(title)}</text>`,
        '<g stroke-linecap="round">',
      ];

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

        svgParts.push(`<line x1="${sourceX}" y1="${sourceY}" x2="${targetX}" y2="${targetY}" stroke="${edge.style?.stroke ?? '#94a3b8'}" stroke-width="${edge.style?.strokeWidth ?? 1}"${edge.style?.strokeDasharray ? ` stroke-dasharray="${edge.style.strokeDasharray}"` : ''} />`);
      });

      svgParts.push('</g><g>');

      graphLayout.nodes.forEach((node) => {
        const nodeWidth = node.width ?? 260;
        const nodeHeight = node.height ?? 144;
        const x = node.position?.x ?? 0;
        const y = node.position?.y ?? 0;
        const label = node.data?.label ?? node.id;
        const lines = wrapLabel(label, 24);
        const textY = y + 32;

        svgParts.push(`<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="12" fill="${node.style?.background ?? '#0f172a'}" stroke="${node.style?.borderColor ?? '#ffffff'}" stroke-width="2" />`);
        svgParts.push(`<text x="${x + 16}" y="${textY}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600">${lines.map((line, index) => `<tspan x="${x + 16}" dy="${index === 0 ? 0 : 16}">${escapeXml(line)}</tspan>`).join('')}</text>`);
      });

      svgParts.push('</g></svg>');

      const svgMarkup = svgParts.join('');
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = 2;
          canvas.width = width * scale;
          canvas.height = height * scale;
          const context = canvas.getContext('2d');
          context.scale(scale, scale);
          context.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `${graphTitle}.png`;
          link.href = dataUrl;
          link.click();
          resolve();
        };
        image.onerror = () => reject(new Error('Unable to render graph SVG'));
        image.src = svgUrl;
      });

      URL.revokeObjectURL(svgUrl);
    } catch (error) {
      console.error('Failed to export graph image', error);
    } finally {
      setIsExporting(false);
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

    findPath(visibleCallTree);
    return path;
  }, [visibleCallTree, activeStateKey]);

  const elk = useMemo(() => new ELK(), []);

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

    visibleCallTree.forEach((node) => walk(node));
    return { nodes, edges };
  }, [visibleCallTree]);

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

    const path = findPath(visibleCallTree, hoveredNode.id) ?? [];
    return { node, children, path };
  }, [hoveredNode, rawGraph, visibleCallTree]);

  const getTooltipStyle = () => ({
    left: `${tooltipPos.x + 16}px`,
    top: `${tooltipPos.y + 16}px`,
  });

  useEffect(() => {
    if (!rawGraph.nodes.length) {
      setGraphLayout({ nodes: [], edges: [] });
      return;
    }

    if (rawGraph.nodes.length > MAX_VISIBLE_NODES || rawGraph.edges.length > MAX_VISIBLE_NODES * 2) {
      const fallbackNodes = rawGraph.nodes.map((node, index) => ({
        ...node,
        position: { x: (index % 6) * 280, y: Math.floor(index / 6) * 180 },
        sourcePosition: 'bottom',
        targetPosition: 'top',
      }));
      setGraphLayout({ nodes: fallbackNodes, edges: rawGraph.edges });
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
      {exceedsRenderBudget ? (
        <div className="tree-render-warning">
          This tree is too large for full interactive rendering. Showing the first {MAX_VISIBLE_NODES} nodes to keep the page responsive.
        </div>
      ) : null}
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
          {(visibleCallTree.length ? visibleCallTree : []).map((node) => (
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
              <button type="button" onClick={handleExportGraph} disabled={isExporting || exceedsRenderBudget}>
                {isExporting ? 'Exporting…' : 'Export PNG'}
              </button>
              <button type="button" onClick={() => setShowGraph(false)}>Close</button>
            </div>
            <div className="tree-graph-shell" ref={graphRef}>
              {exceedsRenderBudget ? (
                <div className="tree-render-warning tree-render-warning-modal">
                  The graph preview is skipped for very large runs to avoid browser overload. Use a smaller input or a memoized run to inspect the tree visually.
                </div>
              ) : (
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
              )}
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

export default function TreeView(props) {
  return (
    <TreeViewErrorBoundary>
      <TreeViewContent {...props} />
    </TreeViewErrorBoundary>
  );
}
