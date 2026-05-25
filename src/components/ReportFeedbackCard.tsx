import { useEffect, useState } from "react";
import { Star, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { detectSuspicious } from "@/lib/contentFilter";

interface Props {
  analysisId: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Not useful",
  2: "A bit off",
  3: "Decent",
  4: "Pretty good",
  5: "Loved it",
};

const MAX_COMMENT = 2000;

/**
 * Post-scan overall feedback. Star rating + optional comment.
 * Stored in `report_feedback`. One row per (analysis, user) — updates allowed.
 */
export default function ReportFeedbackCard({ analysisId }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Hydrate any existing feedback so users see what they already left.
  useEffect(() => {
    if (!user || !analysisId) {
      setLoading(false);
      return;
    }
    supabase
      .from("report_feedback")
      .select("id, rating, comment")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRating(data.rating);
          setComment(data.comment || "");
          setExistingId(data.id);
          setSubmitted(true);
        }
        setLoading(false);
      });
  }, [user, analysisId]);

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    if (rating < 1 || rating > 5) {
      toast.error("Pick a star rating first");
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length > MAX_COMMENT) {
      toast.error(`Comment must be under ${MAX_COMMENT} characters`);
      return;
    }
    if (trimmed) {
      const suspicious = detectSuspicious(trimmed);
      if (suspicious) {
        toast.error(suspicious);
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      analysis_id: analysisId,
      user_id: user.id,
      rating,
      comment: trimmed || null,
    };

    const { error } = existingId
      ? await supabase.from("report_feedback").update(payload).eq("id", existingId)
      : await supabase.from("report_feedback").insert(payload);

    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Could not save feedback");
      return;
    }
    setSubmitted(true);
    toast.success(existingId ? "Feedback updated" : "Thanks for the feedback");
  };

  if (loading) return null;

  const activeRating = hover || rating;

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 16,
        padding: "32px 28px",
        marginTop: 32,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#f97316",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Your feedback
      </div>
      <h3 style={{ color: "#fafafa", fontSize: 20, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
        How useful was this report?
      </h3>
      <p style={{ color: "#888", fontSize: 14, margin: "8px 0 22px", lineHeight: 1.6 }}>
        Two minutes of your honesty makes the next scan sharper for everyone.
      </p>

      {/* Star row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= activeRating;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              disabled={submitting}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              style={{
                background: "transparent",
                border: "none",
                cursor: submitting ? "default" : "pointer",
                padding: 6,
                lineHeight: 0,
              }}
            >
              <Star
                size={32}
                fill={filled ? "#f97316" : "transparent"}
                stroke={filled ? "#f97316" : "#444"}
                strokeWidth={1.5}
                style={{ transition: "all 120ms ease" }}
              />
            </button>
          );
        })}
        <div style={{ marginLeft: 12, fontSize: 13, color: "#888", minWidth: 90 }}>
          {activeRating ? RATING_LABELS[activeRating] : "Tap a star"}
        </div>
      </div>

      {/* Comment */}
      <div style={{ marginTop: 18 }}>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          placeholder="What worked? What was wrong, missing, or confusing? (optional)"
          rows={4}
          disabled={submitting}
          style={{
            width: "100%",
            background: "#000",
            border: "1px solid #1a1a1a",
            borderRadius: 10,
            color: "#fafafa",
            fontSize: 14,
            lineHeight: 1.6,
            padding: "12px 14px",
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#333")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 11, color: "#555" }}>
            {comment.length}/{MAX_COMMENT}
            {submitted && (
              <span style={{ marginLeft: 12, color: "#22c55e", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Check size={11} /> Saved
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || rating < 1}
            className="vercel-btn-primary"
            style={{ opacity: submitting || rating < 1 ? 0.5 : 1, cursor: submitting || rating < 1 ? "not-allowed" : "pointer" }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />
                Saving…
              </>
            ) : submitted ? (
              "Update feedback"
            ) : (
              "Send feedback"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}