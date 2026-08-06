export default function StatCard({label,value}:{label:string;value:string|number}) {
  return (
    <article className="stat-card">
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}
