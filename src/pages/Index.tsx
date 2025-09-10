import ModernHeader from "@/components/ModernHeader";
import ModernHeroSection from "@/components/ModernHeroSection";
import FeaturedTrips from "@/components/FeaturedTrips";
import HowItWorks from "@/components/HowItWorks";
import Advantages from "@/components/Advantages";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <ModernHeader />
      <main>
        <ModernHeroSection />
        <FeaturedTrips />
        <HowItWorks />
        <Advantages />
      </main>
      <Footer />
    </div>
  );
};

export default Index;