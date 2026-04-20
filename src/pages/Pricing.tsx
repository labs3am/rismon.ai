import { useEffect } from 'react';
import Index from './Index';
import SEO from '@/components/SEO';

/**
 * Dedicated /pricing route. Reuses the home page (which already contains the
 * full pricing section anchored at #pricing) but advertises pricing-specific
 * title, description, and canonical so Google shows the correct snippet when
 * someone searches "rismon price".
 */
export default function Pricing() {
  useEffect(() => {
    // Scroll to the pricing section on mount.
    requestAnimationFrame(() => {
      const el = document.getElementById('pricing');
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, []);

  return (
    <>
      <SEO
        title="Pricing, Rismon.ai | Free & Pro Plans"
        description="Rismon.ai pricing: Free plan with 3 scans per week, full reports, and fix prompts. Pro at $12/mo for unlimited scans, priority analysis, and early features."
        canonicalPath="/pricing"
      />
      <Index />
    </>
  );
}
