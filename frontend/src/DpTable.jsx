export default function DpTable({ dp }) {
  if (!dp || !dp.length) {
    return null;
  }

  const columns = dp[0].length;

  return (
    <div className="dp-table-wrapper">
      <h3>DP table</h3>
      <div className="dp-table" style={{ gridTemplateColumns: `70px repeat(${columns}, 44px)` }}>
        <div className="dp-header">i\j</div>
        {Array.from({ length: columns }, (_, colIndex) => (
          <div key={`col-${colIndex}`} className="dp-header">
            {colIndex}
          </div>
        ))}

        {dp.map((row, rowIndex) => (
          <>
            <div key={`row-label-${rowIndex}`} className="dp-header">
              {rowIndex}
            </div>
            {row.map((value, colIndex) => (
              <div key={`${rowIndex}-${colIndex}`} className={`dp-cell ${value ? 'true' : 'false'}`}>
                {value ? 'T' : 'F'}
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
