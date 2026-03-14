import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Insight — Analytics & AI | Kontafy",
  description:
    "AI-powered cash flow forecasting, P&L dashboards, balance sheet reports, custom analytics, expense trends, and revenue insights for smarter business decisions.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Insight",
  title: "AI-powered insights for smarter decisions",
  titleGreen: "smarter decisions",
  subtitle: "See the future of your finances, not just the past.",
  heroDescription:
    "Kontafy Insight combines real-time analytics with AI forecasting to give you a crystal-clear picture of your business health -- from cash flow projections to expense trends and revenue patterns.",
  features: [
    {
      icon: "Brain",
      title: "AI Cash Flow Forecasting",
      description:
        "Predict your cash position 30, 60, or 90 days ahead. Our AI analyzes payment patterns, seasonal trends, and outstanding invoices to forecast with high accuracy.",
    },
    {
      icon: "BarChart3",
      title: "P&L Dashboards",
      description:
        "Real-time profit and loss statements with visual breakdowns. Compare periods, track margins, and spot trends the moment they emerge.",
    },
    {
      icon: "PieChart",
      title: "Balance Sheet",
      description:
        "Live balance sheet with drill-down into assets, liabilities, and equity. Always know your exact net worth and financial position.",
    },
    {
      icon: "FileBarChart",
      title: "Custom Reports",
      description:
        "Build any report you need with drag-and-drop filters. Save report templates, schedule automated delivery, and share with your team.",
    },
    {
      icon: "TrendingDown",
      title: "Expense Trends",
      description:
        "Visualize spending patterns across categories, vendors, and time periods. Identify cost-saving opportunities before they become problems.",
    },
    {
      icon: "TrendingUp",
      title: "Revenue Analytics",
      description:
        "Track revenue by customer, product, region, or channel. Understand what drives growth and where to focus your efforts.",
    },
  ],
  workflowTitle: "From raw data to actionable insights",
  workflowDescription:
    "Kontafy Insight transforms your financial data into clear, actionable intelligence without requiring a finance team.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Data flows in automatically",
      description:
        "Every transaction from Books, Bill, Bank, and other modules feeds into Insight in real time. No manual data export needed.",
    },
    {
      step: "Step 2",
      title: "AI analyzes patterns",
      description:
        "Our AI engine identifies trends, anomalies, and patterns in your financial data. It learns from your business to provide increasingly accurate insights.",
    },
    {
      step: "Step 3",
      title: "Visualize in dashboards",
      description:
        "Access pre-built dashboards for P&L, balance sheet, cash flow, and more. Customize views to focus on the metrics that matter to you.",
    },
    {
      step: "Step 4",
      title: "Act on forecasts",
      description:
        "Use AI forecasts to plan ahead. Know when cash will be tight, when to invest, and when to cut back -- before it happens.",
    },
  ],
  benefits: [
    {
      title: "Predict cash shortfalls",
      description:
        "AI forecasting warns you about potential cash flow gaps weeks in advance, giving you time to arrange funding or adjust spending.",
    },
    {
      title: "Make data-driven decisions",
      description:
        "Replace gut feelings with hard data. Every business decision backed by real-time financial analytics.",
    },
    {
      title: "Spot profit leaks",
      description:
        "Margin analysis by product, customer, and channel reveals where you are making money and where you are losing it.",
    },
    {
      title: "Save time on reporting",
      description:
        "No more manual report building in spreadsheets. Automated reports are generated and delivered on your schedule.",
    },
    {
      title: "Impress your investors",
      description:
        "Professional financial reports and dashboards that make investor updates, board meetings, and bank presentations effortless.",
    },
    {
      title: "Track KPIs in real time",
      description:
        "Monitor key financial metrics like DSO, gross margin, burn rate, and runway from a single dashboard.",
    },
  ],
  ctaTitle: "Unlock the power of your financial data",
  ctaDescription:
    "Start seeing insights that drive growth. Kontafy Insight turns your numbers into a competitive advantage.",
};

export default function InsightPage() {
  return <FeaturePageClient data={data} />;
}
