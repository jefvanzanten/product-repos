import { useEffect, useState } from "react";
import { AddConsumptionLogModal } from "../components/AddConsumptionLogModal";
import { useProducts } from "../hooks/useProducts";
import { useConsumptionLogs } from "../hooks/useConsumptionLogs";

export function Dashboard() {
  const { products, error: errorProducts } = useProducts();
  const { logs, isLoading: loadingLogs } = useConsumptionLogs();

  const today = new Date().toDateString();
  const todayLogs = logs
    .filter((log) => new Date(log.timestamp).toDateString() === today)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function handleLogSuccess() {
    setToast("Consumptie toegevoegd!");
  }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ marginBottom: "24px" }}>Consumption Logger</h1>

      {errorProducts && <p style={{ color: "red" }}>Fout: {errorProducts}</p>}

      {/* Consumption log overzicht */}
      <div style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>
          Recente consumptie-logs
        </h2>
        {loadingLogs && <p>Laden...</p>}
        {!loadingLogs && todayLogs.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Nog geen logs geregistreerd.
          </p>
        )}
        {!loadingLogs && todayLogs.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {todayLogs.map((log) => (
              <li
                key={log.id}
                style={{
                  padding: "12px 16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "14px",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span style={{ color: "#6b7280", minWidth: "42px", fontVariantNumeric: "tabular-nums" }}>
                  {new Date(log.timestamp).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>
                  <strong>{log.consumption?.name ?? '—'}</strong>
                  {'  '}
                  <span style={{ color: '#6b7280' }}>
                    {log.amount} {log.unit?.type ?? '—'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB knop */}
      <button
        onClick={() => setShowModal(true)}
        title="Consumptie toevoegen"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          fontSize: "28px",
          lineHeight: "1",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>

      {showModal && (
        <AddConsumptionLogModal
          onClose={() => setShowModal(false)}
          products={products}
          onSuccess={handleLogSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            background: "#22c55e",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 2000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
