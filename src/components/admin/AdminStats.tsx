import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, AlertTriangle, UserCheck, Package, Truck, Users, ShieldAlert } from 'lucide-react';

interface AdminStatsProps {
  kycPending: number;
  kycApproved: number;
  kycTotal: number;
  reportsOpen: number;
  reportsTotal: number;
  disputesOpen: number;
  disputesTotal: number;
  totalUsers: number;
}

export function AdminStats({ 
  kycPending, 
  kycApproved, 
  kycTotal,
  reportsOpen,
  reportsTotal,
  disputesOpen,
  disputesTotal,
  totalUsers
}: AdminStatsProps) {
  const stats = [
    {
      title: "Documents KYC",
      value: kycTotal,
      subtitle: `${kycPending} en attente`,
      icon: FileText,
      color: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      textColor: "text-blue-700 dark:text-blue-300"
    },
    {
      title: "En attente",
      value: kycPending,
      subtitle: "À traiter",
      icon: Clock,
      color: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      textColor: "text-amber-700 dark:text-amber-300"
    },
    {
      title: "Vérifiés",
      value: kycApproved,
      subtitle: "Utilisateurs",
      icon: UserCheck,
      color: "bg-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
      textColor: "text-green-700 dark:text-green-300"
    },
    {
      title: "Signalements",
      value: reportsTotal,
      subtitle: `${reportsOpen} ouverts`,
      icon: AlertTriangle,
      color: "bg-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      textColor: "text-orange-700 dark:text-orange-300"
    },
    {
      title: "Litiges",
      value: disputesTotal,
      subtitle: `${disputesOpen} actifs`,
      icon: ShieldAlert,
      color: "bg-red-500",
      bgColor: "bg-red-50 dark:bg-red-950",
      textColor: "text-red-700 dark:text-red-300"
    },
    {
      title: "Utilisateurs",
      value: totalUsers,
      subtitle: "Inscrits",
      icon: Users,
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      textColor: "text-purple-700 dark:text-purple-300"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center">
              <div className={`p-6 ${stat.bgColor}`}>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 p-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className={`text-xs ${stat.textColor} font-medium mt-1`}>{stat.subtitle}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
