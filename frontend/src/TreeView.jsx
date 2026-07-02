export default function TreeView({ events }) {
  const calls = events.filter((event) => event.type === 'CALL');

  return (
    <div className="tree-view">
      <h3>Call tree</h3>
      <ul>
        {calls.map((event) => (
          <li key={event.id}>
            <span>Call</span>
            <span>({event.state?.i}, {event.state?.j})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
