import { useEffect, useState } from "react";
import { DESIGNS, type Card, type DesignId } from "@toybox/shared";

// Dirt-simple routing: /card/:id is the recipient's view, anything else is the
// create page. (A real app would use a router; this keeps the example small.)
export function App() {
  const match = window.location.pathname.match(/^\/card\/(.+)$/);
  return match ? <ViewCard id={match[1]} /> : <CreateCard />;
}

function CreateCard() {
  const [design, setDesign] = useState<DesignId>(DESIGNS[0].id);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      setLink(`${window.location.origin}/card/${data.id}`);
    } catch {
      setError("could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  if (link) {
    return (
      <main className="wrap">
        <h1>Your card is ready 🎉</h1>
        <p>Send this link to the lucky recipient:</p>
        <a className="link" href={link}>{link}</a>
        <p className="muted"><a href="/">Make another</a></p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <h1>toybox</h1>
      <p className="sub">Make a greeting card and get a link to send.</p>

      <div className="designs">
        {DESIGNS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={"swatch" + (d.id === design ? " active" : "")}
            style={{ background: `linear-gradient(135deg, ${d.from}, ${d.to})` }}
            onClick={() => setDesign(d.id)}
          >
            {d.name}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Write your message..."
        value={message}
        maxLength={280}
        onChange={(e) => setMessage(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={busy || !message.trim()} onClick={submit}>
        {busy ? "Creating..." : "Create card"}
      </button>
    </main>
  );
}

function ViewCard({ id }: { id: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/cards/${id}`);
        if (res.status === 404) {
          setError("card not found");
          return;
        }
        const data: Card = await res.json();
        if (stopped) return;
        setCard(data);
        // keep polling until the worker has rendered the image
        if (data.status !== "rendered") setTimeout(poll, 1000);
      } catch {
        if (!stopped) setTimeout(poll, 1000);
      }
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [id]);

  if (error) {
    return (
      <main className="wrap">
        <h1>{error}</h1>
        <p className="muted"><a href="/">Make one of your own</a></p>
      </main>
    );
  }
  if (!card) {
    return (
      <main className="wrap">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="wrap">
      {card.image ? (
        <img className="card-img" src={card.image} alt="greeting card" />
      ) : (
        <p className="rendering">Rendering your card…</p>
      )}
      <p className="message">“{card.message}”</p>
      <p className="muted"><a href="/">Make your own</a></p>
    </main>
  );
}
