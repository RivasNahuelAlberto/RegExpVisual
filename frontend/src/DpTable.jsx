import { useState } from 'react';

export default function DpTable({ dp, dependencies, order, selectedCell, onSelectState, s = '', p = '' }) {
  const [internalSelectedCell, setInternalSelectedCell] = useState(null);

  if (!dp || !dp.length) {
    return null;
  }

  const activeCell = selectedCell ?? internalSelectedCell;

  const handleSelectCell = (cellKey, rowIndex, colIndex) => {
    setInternalSelectedCell(cellKey);
    onSelectState?.({ i: rowIndex, j: colIndex });
  };

  const columns = dp[0].length;
  const rows = dp.length;

  const getLabel = (index, text) => {
    const length = text?.length ?? 0;
    if (index < length) {
      return text?.[index] ?? '';
    }
    if (index === length) {
      return '""';
    }
    return '';
  };

  return (
    <div className="dp-table-wrapper">
      <h3>DP table</h3>
      <div className="dp-table" style={{ gridTemplateColumns: `70px repeat(${columns}, 56px)` }}>
        <div className="dp-header">i\j</div>
        {Array.from({ length: columns }, (_, colIndex) => (
          <div key={`col-${colIndex}`} className="dp-header">
            {getLabel(colIndex, p)}
          </div>
        ))}

        {dp.map((row, rowIndex) => (
          <>
            <div key={`row-label-${rowIndex}`} className="dp-header">
              {getLabel(rowIndex, s)}
            </div>
            {row.map((value, colIndex) => {
              const key = `${rowIndex},${colIndex}`;
              const isSelected = activeCell === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`dp-cell ${value ? 'true' : 'false'} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectCell(key, rowIndex, colIndex)}
                >
                  <span>{value ? 'T' : 'F'}</span>
                  <small>{order?.[key] ?? ''}</small>
                </button>
              );
            })}
          </>
        ))}
      </div>

      {activeCell ? (
        <div className="dependency-card">
          <h4>Cell {activeCell}</h4>
          <p><strong>Dependencies:</strong> {dependencies?.[activeCell]?.join(', ') || 'None'}</p>
        </div>
      ) : null}
    </div>
  );
}
