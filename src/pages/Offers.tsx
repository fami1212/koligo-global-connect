import { OfferSystem } from '@/components/OfferSystem';

export default function Offers() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <OfferSystem mode="manage" />
      </div>
    </div>
  );
}