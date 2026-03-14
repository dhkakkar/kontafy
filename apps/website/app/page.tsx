import AnnouncementBar from "@/components/layout/AnnouncementBar";
import HeroSection from "@/components/home/HeroSection";
import PainSolutionBridge from "@/components/home/PainSolutionBridge";
import ModuleCarousel from "@/components/home/ModuleCarousel";
import WhatsAppSpotlight from "@/components/home/WhatsAppSpotlight";
import EcommerceSpotlight from "@/components/home/EcommerceSpotlight";
import AIInsightSpotlight from "@/components/home/AIInsightSpotlight";
import SocialProof from "@/components/home/SocialProof";
import IndustryTabs from "@/components/home/IndustryTabs";
import PricingSnapshot from "@/components/home/PricingSnapshot";
import MigrationSection from "@/components/home/MigrationSection";
import FinalCTA from "@/components/home/FinalCTA";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <HeroSection />
      <PainSolutionBridge />
      <ModuleCarousel />
      <WhatsAppSpotlight />
      <EcommerceSpotlight />
      <AIInsightSpotlight />
      <SocialProof />
      <IndustryTabs />
      <PricingSnapshot />
      <MigrationSection />
      <FinalCTA />
    </>
  );
}
