import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Legacy /report/:analysisId route — the dashboard now hosts the full
 * inline report. We forward to /dashboard?analysis=<id> so existing
 * deep links keep working and land on the right app.
 */
export default function Report() {
  const { analysisId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (analysisId) {
      navigate(`/dashboard?analysis=${analysisId}`, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [analysisId, navigate]);

  return null;
}
