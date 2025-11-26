import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer"

export default function IntakeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-3 sm:p-4">
        <div className="max-w-2xl mx-auto py-4 sm:py-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Header skeleton */}
            <div className="text-center space-y-1 sm:space-y-2 px-2">
            <Skeleton className="h-7 sm:h-9 w-48 sm:w-64 mx-auto" />
            <Skeleton className="h-4 sm:h-5 w-36 sm:w-48 mx-auto" />
          </div>

          {/* Form skeleton */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <Skeleton className="h-5 sm:h-6 w-40 sm:w-48" />
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Tabs skeleton */}
              <div className="space-y-3 sm:space-y-4">
                <Skeleton className="h-8 sm:h-10 w-full" />
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* File upload skeleton */}
              <div className="space-y-3 sm:space-y-4">
                <Skeleton className="h-5 sm:h-6 w-28 sm:w-32" />
                <Skeleton className="h-16 sm:h-20 w-full" />
               
              </div>

              {/* Buttons skeleton */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 pt-2 sm:pt-4">
                <Skeleton className="h-10 w-full sm:w-32" />
                <Skeleton className="h-10 w-full sm:w-32" />
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

      <Footer/>

    </div>
  );
}

