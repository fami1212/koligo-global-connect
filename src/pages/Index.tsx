import ModernHeader from "@/components/ModernHeader";
import ModernHeroSection from "@/components/ModernHeroSection";
import HomeTripSearch from "@/components/HomeTripSearch";
import FeaturedTrips from "@/components/FeaturedTrips";
import HowItWorks from "@/components/HowItWorks";
import Advantages from "@/components/Advantages";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <ModernHeader />
      <main>
        <ModernHeroSection />
        <HomeTripSearch />
        <HowItWorks />
        <FeaturedTrips />
        <Advantages />
      </main>
      <Footer />
    </div>
  );
};

export default Index;