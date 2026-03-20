const moderationQueue = [
  { id: "rep-102", severity: "high", summary: "Unsafe behavior report at VI lounge", sla: "5 min" },
  { id: "rep-099", severity: "medium", summary: "Late arrival dispute", sla: "12 min" }
];

const venues = [
  { name: "The Lobby, Victoria Island", city: "Lagos", readiness: "ready" },
  { name: "Maple Cafe, Wuse II", city: "Abuja", readiness: "waitlist" }
];

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Sway Operations</p>
        <h1>Support, moderation, and venue coverage in one console.</h1>
        <p className="lede">
          Designed for real-date operations: trust reviews, freeze decisions, venue readiness, and booking escalations.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Moderation queue</h2>
          {moderationQueue.map((item) => (
            <div key={item.id} className="row">
              <div>
                <strong>{item.id}</strong>
                <p>{item.summary}</p>
              </div>
              <div>
                <span className={`pill ${item.severity}`}>{item.severity}</span>
                <p>{item.sla}</p>
              </div>
            </div>
          ))}
        </article>

        <article className="panel">
          <h2>Venue network</h2>
          {venues.map((venue) => (
            <div key={venue.name} className="row">
              <div>
                <strong>{venue.name}</strong>
                <p>{venue.city}</p>
              </div>
              <span className={`pill ${venue.readiness}`}>{venue.readiness}</span>
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}
