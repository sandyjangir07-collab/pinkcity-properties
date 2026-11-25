import { buildMetadata } from "../../lib/seo";
import CalculatorView from "./CalculatorView";

export const metadata = buildMetadata({
  title: "True Cost Calculator — EMI, Stamp Duty & Total Cost | PinkCity",
  description: "See what a property really costs — EMI, Rajasthan stamp duty & registration, brokerage, and total transaction value, all in one place. Get a personalized loan offer from our banking partners.",
  path: "/calculator",
});

export default function CalculatorPage() {
  return <CalculatorView />;
}
