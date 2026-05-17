import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { apiFetch, type HistoryItem } from "@/lib/api";

function SentimentBadge({ s }: { s: string | null }) {
  if (s === "positive") return <span className="wf-badge-positive">Позитивний</span>;
  if (s === "negative") return <span className="wf-badge-negative">Негативний</span>;
  return <span className="wf-badge-neutral">Нейтральний</span>;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

function ConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border border-border shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <p className="text-sm font-medium text-foreground">
          Ви впевнені, що хочете очистити всю історію?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-sm hover:opacity-90 transition-opacity"
          >
            Так, очистити
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

export default function History() {
  const [, navigate] = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => apiFetch<{ count: number; assets: HistoryItem[] }>("/assets")
    .then(r => r.assets),
    staleTime: 60 * 1000,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/assets`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не вдалося очистити історію");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });

  return (
    <Layout>
      {showConfirm && (
        <ConfirmDialog
          onConfirm={() => {
            setShowConfirm(false);
            clearMutation.mutate();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold">Історія аналізів</h2>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={clearMutation.isPending || data.length === 0}
            className="border border-destructive text-destructive rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-destructive/10 disabled:opacity-40 transition-colors"
          >
            {clearMutation.isPending ? "Очищення…" : "Очистити історію"}
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Раніше проаналізовані активи {!isLoading && `(${data.length})`}
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Ви ще не аналізували жодного активу. Почніть пошук на головній сторінці.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="py-2 text-xs font-medium">Тікер</th>
                  <th className="py-2 text-xs font-medium hidden sm:table-cell">Назва</th>
                  <th className="py-2 text-xs font-medium text-right">Оцінка</th>
                  <th className="py-2 text-xs font-medium text-right">Тональність</th>
                  <th className="py-2 text-xs font-medium text-right hidden md:table-cell">
                    Останній аналіз
                  </th>
                  <th className="py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr
                    key={a.ticker}
                    onClick={() => navigate(`/dashboard/${a.ticker}`)}
                    className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 font-mono font-semibold">{a.ticker}</td>
                    <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{a.name}</td>
                    <td
                      className={`py-2.5 text-right font-mono ${
                        (a.sentiment_score ?? 0) > 0.2
                          ? "text-green-600"
                          : (a.sentiment_score ?? 0) < -0.2
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {a.sentiment_score != null
                        ? `${a.sentiment_score > 0 ? "+" : ""}${a.sentiment_score.toFixed(2)}`
                        : "–"}
                    </td>
                    <td className="py-2.5 text-right">
                      <SentimentBadge s={a.sentiment_label} />
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground text-xs hidden md:table-cell">
                      {formatDate(a.last_analyzed)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/${a.ticker}`);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Переглянути →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
