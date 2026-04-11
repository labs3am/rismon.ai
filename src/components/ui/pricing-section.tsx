"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sparkles as SparklesComp } from "@/components/ui/sparkles";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

const plans = [
  {
    name: "Free",
    description:
      "Great for non-technical founders understanding their first AI-built app",
    price: 0,
    yearlyPrice: 0,
    buttonText: "Get started free",
    buttonVariant: "outline" as const,
    includes: [
      "What you get:",
      "1 app included",
      "3 scans per week",
      "Full plain English report",
      "Business logic verification",
      "Security issue detection",
      "GitHub secret scan",
      "Fix prompts for every issue",
      "Works with all AI platforms",
    ],
  },
  {
    name: "Pro",
    description:
      "For founders with real users who need continuous protection and monitoring",
    price: 999,
    yearlyPrice: 9588,
    buttonText: "Join founding member waitlist",
    buttonVariant: "default" as const,
    popular: true,
    includes: [
      "Everything in Free, plus:",
      "Unlimited apps",
      "Unlimited scans",
      "Daily automatic scan",
      "New commit scan",
      "CVE vulnerability alerts",
      "WhatsApp and email alerts",
      "Score history and trends",
      "Investor ready PDF report",
      "Business type deep scan",
      "Priority support",
    ],
  },
];

const PricingSwitch = ({ onSwitch }: { onSwitch: (value: string) => void }) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center">
      <div className="relative flex items-center rounded-full bg-muted p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 w-fit h-10 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors",
            selected === "0" ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId="pricing-switch"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">Monthly</span>
        </button>
        <button
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 w-fit h-10 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors",
            selected === "1" ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId="pricing-switch"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">Yearly</span>
        </button>
      </div>
    </div>
  );
};

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLElement>(null);

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  return (
    <section ref={pricingRef} className="relative overflow-hidden py-28 px-6">
      {/* Background sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        <SparklesComp
          className="h-full w-full"
          color="hsl(24, 94%, 53%)"
          density={100}
          speed={0.4}
          size={1.2}
          opacity={0.4}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <div className="relative z-10 max-w-[960px] mx-auto">
        {/* Header */}
        <TimelineContent animationNum={0} timelineRef={pricingRef}>
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">
              PRICING
            </p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">
              <VerticalCutReveal splitBy="words" staggerDuration={0.08}>
                Simple and honest pricing
              </VerticalCutReveal>
            </h2>
            <p className="text-muted-foreground text-base mt-3 max-w-md mx-auto">
              Start free. Upgrade when you need continuous protection for your app.
            </p>
          </div>
        </TimelineContent>

        {/* Switch */}
        <TimelineContent animationNum={1} timelineRef={pricingRef}>
          <div className="mt-8">
            <PricingSwitch onSwitch={togglePricingPeriod} />
          </div>
        </TimelineContent>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {plans.map((plan, index) => (
            <TimelineContent
              key={index}
              animationNum={index + 2}
              timelineRef={pricingRef}
            >
              <Card
                className={cn(
                  "relative bg-card border rounded-2xl overflow-hidden h-full",
                  plan.popular
                    ? "border-primary shadow-[0_0_40px_rgba(249,115,22,0.12)]"
                    : "border-border"
                )}
              >
                {plan.popular && (
                  <span className="absolute top-4 right-4 inline-block text-[11px] px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                    FOUNDING MEMBER
                  </span>
                )}
                <CardHeader className="p-8 pb-0">
                  <div>
                    <h3 className="text-foreground text-[28px] font-bold">
                      {plan.name}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-muted-foreground text-lg">₹</span>
                    <NumberFlow
                      value={isYearly ? plan.yearlyPrice : plan.price}
                      className="text-foreground text-4xl font-bold"
                      format={{ useGrouping: true }}
                      transformTiming={{ duration: 500, easing: "ease-out" }}
                      willChange
                    />
                    <span className="text-muted-foreground text-sm ml-1">
                      /{isYearly ? "year" : "month"}
                    </span>
                  </div>

                  <p className="text-muted-foreground text-sm mt-3">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="p-8 pt-6">
                  <button
                    className={cn(
                      "w-full py-3 rounded-lg text-sm font-medium transition-colors",
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {plan.buttonText}
                  </button>

                  <div className="mt-6">
                    <p className="text-foreground text-sm font-semibold">
                      {plan.includes[0]}
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {plan.includes.slice(1).map((feature, featureIndex) => (
                        <div
                          key={featureIndex}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle
                            size={15}
                            className={cn(
                              "shrink-0",
                              plan.popular ? "text-primary" : "text-success"
                            )}
                          />
                          <span className="text-muted-foreground text-sm">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TimelineContent>
          ))}
        </div>
      </div>
    </section>
  );
}
